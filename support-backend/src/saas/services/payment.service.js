// payment.service.js
// src/saas/services/payment.service.js
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');
const SubscriptionService = require('./subscription.service');
const AddonService = require('./addon.service');
const WalletService = require('./wallet.service');
const Company = require('../models/company.model');
const { enqueueJob } = require('../libs/jobQueue');
const { PaymentStatus, PaymentMethod } = require('../constants/saas.constant');

class PaymentService {
  static async createPayment({ orderId, companyId, amountPaise, method, providerResponse = {}, createdBy = null }) {
    const payment = await Payment.create({ order: orderId, company: companyId, amountPaise, method, providerResponse, status: PaymentStatus.PENDING, createdBy });

    // enqueue payment reconciliation for offline or if gateway slow; we set a scheduled check
    if (method === PaymentMethod.OFFLINE) {
      // admin must approve: create a job to notify finance/admin
      await enqueueJob({
        type: 'notification.notify_admin_offline_payment',
        payload: { paymentId: payment._id, companyId },
        scheduledAt: Date.now() + 1000
      });
    } else {
      // schedule reconciliation job after a delay to re-verify statuses with gateway if needed
      await enqueueJob({
        type: 'payment.reconcile',
        payload: { paymentId: payment._id },
        scheduledAt: Date.now() + 1000 * 60 * 5 // 5 minutes
      });
    }

    // audit job
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'payment.create', entityType: 'Payment', entityId: payment._id, companyId }, priority: 8 });

    return payment;
  }

  // Called by payment gateway webhook when success
  static async markOnlinePaymentSuccess(paymentId, transactionId, providerResponse = {}) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    payment.status = PaymentStatus.SUCCESS;
    payment.transactionId = transactionId;
    payment.providerResponse = Object.assign(payment.providerResponse || {}, providerResponse);
    await payment.save();

    const order = await Order.findById(payment.order);
    if (!order) return { payment };

    order.status = 'PAID';
    await order.save();

    // enqueue audit + order paid job
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'payment.success', entityType: 'Payment', entityId: payment._id }, priority: 10 });
    await enqueueJob({ type: 'order.paid', payload: { orderId: order._id, paymentId: payment._id }, priority: 10 });

    // handle order types
    if (order.type === 'PLAN') {
      // Activate subscription synchronously, but still enqueue extra jobs for workers
      await SubscriptionService.activateNewSubscriptionAfterPayment(order.company, (await require('../models/plan.model').findById(order.targetId)).code, payment);
      // schedule subscription expiry job
      const sub = await require('../models/subscription.model').findOne({ company: order.company, status: 'ACTIVE' });
      if (sub) {
        await enqueueJob({ type: 'subscription.expiry_schedule', payload: { subscriptionId: sub._id, companyId: order.company }, scheduledAt: sub.endDate.getTime(), priority: 10 });
      }
    } else if (order.type === 'ADDON') {
      // apply addon now
      await AddonService.applyPaidAddon(order.company, order.targetId, { payment, units: order.meta && order.meta.units });
      await enqueueJob({ type: 'addon.applied', payload: { companyId: order.company, addonId: order.targetId, paymentId: payment._id }, priority: 8 });
    } else if (order.type === 'WALLET_TOPUP') {
      await WalletService.credit(order.company, order.amountPaise, { order: order._id });
      await enqueueJob({ type: 'wallet.topup', payload: { companyId: order.company, amountPaise: order.amountPaise }, priority: 5 });
    }

    return payment;
  }

  // Admin confirms offline/cash payment
  static async approveOffline(paymentId, adminUserId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    payment.status = PaymentStatus.SUCCESS;
    payment.approvedBy = adminUserId;
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order) {
      order.status = 'PAID';
      await order.save();
      await enqueueJob({ type: 'order.paid', payload: { orderId: order._id, paymentId: payment._id }, priority: 10 });
    }

    // if plan order -> activate
    if (order && order.type === 'PLAN') {
      const plan = await require('../models/plan.model').findById(order.targetId);
      await SubscriptionService.activateNewSubscriptionAfterPayment(payment.company, plan.code, payment, adminUserId);
    } else if (order && order.type === 'ADDON') {
      // admin approved offline addon => apply
      await AddonService.adminApplyPendingAddonOnPayment(payment._id, payment.company);
    } else if (order && order.type === 'WALLET_TOPUP') {
      await WalletService.credit(payment.company, order.amountPaise, { approvedBy: adminUserId, order: order._id });
    }

    await enqueueJob({ type: 'audit.log_event', payload: { action: 'payment.approved_offline', entityType: 'Payment', entityId: payment._id, approvedBy: adminUserId }, priority: 10 });

    return { payment, order };
  }

  static async markPaymentFailed(paymentId, reason) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    payment.status = PaymentStatus.FAILED;
    payment.providerResponse = Object.assign(payment.providerResponse || {}, { failReason: reason });
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order) {
      order.status = 'FAILED';
      await order.save();
    }

    // enqueue notification to company to retry
    await enqueueJob({ type: 'notification.payment_failed', payload: { paymentId, companyId: payment.company, reason }, priority: 8 });
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'payment.failed', entityType: 'Payment', entityId: payment._id, reason }, priority: 10 });

    return { payment, order };
  }

  static async refundPayment(paymentId, amountPaise, reason, adminUserId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    payment.status = PaymentStatus.REFUNDED;
    payment.providerResponse = Object.assign(payment.providerResponse || {}, { refund: { amountPaise, reason, refundedBy: adminUserId, refundedAt: new Date() } });
    await payment.save();

    // credit to wallet by default
    await WalletService.credit(payment.company, amountPaise, { refundOfPayment: paymentId, reason });
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'payment.refund', entityType: 'Payment', entityId: paymentId, amountPaise, refundedBy: adminUserId }, priority: 10 });
    return payment;
  }
}

module.exports = PaymentService;
