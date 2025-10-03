// src/saas/services/billing.service.js
const Subscription = require('../models/subscription.model');
const Company = require('../models/company.model');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const WalletService = require('./wallet.service');
const { enqueueJob } = require('../libs/jobQueue');
const { JOB_TYPES } = require('../constants/job.constant');
const moment = require('moment');

/**
 * BillingService responsibilities:
 * - Generate invoice/order for subscriptions that are due
 * - For PREPAID (wallet) companies, attempt to debit wallet and auto-renew
 * - For POSTPAID, generate pending orders/invoices for collection
 * - Apply coupon if present on recurring plan (not automatic usually)
 *
 * This service should be invoked by billing worker on a schedule (daily/hourly).
 */
class BillingService {
  /**
   * Run scheduled billing: find subscriptions expiring within the 'window' and process renewals.
   * - windowDays: how many days ahead to consider due (default 0 => due today)
   */
  static async processRenewals({ windowDays = 0 } = {}) {
    const now = moment();
    const cutoff = moment().add(windowDays, 'days').toDate();

    // find active subscriptions whose endDate <= cutoff
    const subs = await Subscription.find({
      status: 'ACTIVE',
      endDate: { $lte: cutoff }
    }).lean();

    let processed = 0;

    for (const s of subs) {
      processed++;
      const company = await Company.findById(s.company).lean();
      const plan = await require('../models/plan.model').findById(s.planId).lean();
      if (!company || !plan) continue;

      const amountPaise = plan.pricePaise || 0;

      if (company.billingType === 'PREPAID') {
        // try to debit wallet
        const debited = await WalletService.debitIfSufficient(company._id, amountPaise);

        if (debited) {
          // create paid order + payment
          const order = await Order.create({
            company: company._id,
            type: 'PLAN',
            targetId: plan._id,
            amountPaise,
            status: 'PAID'
          });

          await Payment.create({
            order: order._id,
            company: company._id,
            amountPaise,
            method: 'WALLET',
            status: 'SUCCESS'
          });

          // extend subscription - simple renew: start=now; end=now+duration
          const durationDays = plan.durationDays || 30;
          await Subscription.findByIdAndUpdate(s._id, {
            startDate: moment().toDate(),
            endDate: moment().add(durationDays, 'days').toDate()
          });

          await enqueueJob({
            type: JOB_TYPES.AUDIT_LOG,
            payload: {
              action: 'billing.renew_success',
              companyId: company._id,
              subscriptionId: s._id,
              amountPaise
            },
            priority: 8
          });
        } else {
          // insufficient wallet; mark company status/invoice
          await Company.findByIdAndUpdate(company._id, {
            status: 'INACTIVE',
            statusReason: 'Auto-renew failed - insufficient wallet'
          });

          await enqueueJob({
            type: JOB_TYPES.AUDIT_LOG,
            payload: {
              action: 'billing.renew_failed_insufficient_wallet',
              companyId: company._id,
              subscriptionId: s._id
            },
            priority: 9
          });
        }
      } else {
        // POSTPAID: create pending order/invoice for later collection
        const order = await Order.create({
          company: company._id,
          type: 'PLAN',
          targetId: plan._id,
          amountPaise,
          status: 'PENDING'
        });

        await enqueueJob({
          type: JOB_TYPES.BILLING_GENERATE_INVOICE,
          payload: { orderId: order._id, companyId: company._id },
          priority: 6
        });
      }
    }

    return { processed };
  }

  /**
   * Generate an invoice payload (simple JSON) for an order (usage based + plan)
   * This doesn't produce a PDF. Worker can call a PDF generator if needed.
   */
  static async generateInvoiceForOrder(orderId) {
    const order = await Order.findById(orderId).lean();
    if (!order) throw new Error('Order not found');

    const company = await Company.findById(order.company).lean();
    const lines = [];

    if (order.type === 'PLAN') {
      const plan = await require('../models/plan.model').findById(order.targetId).lean();
      if (plan) lines.push({ description: `Plan: ${plan.name}`, amountPaise: order.amountPaise });
    } else if (order.type === 'ADDON') {
      const addon = await require('../models/addon.model').findById(order.targetId).lean();
      if (addon) lines.push({ description: `Addon: ${addon.name}`, amountPaise: order.amountPaise });
    } else if (order.type === 'WALLET_TOPUP') {
      lines.push({ description: `Wallet Topup`, amountPaise: order.amountPaise });
    }

    // build invoice
    const invoice = {
      invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company: { id: company._id, name: company.name, gstNo: company.gstNo },
      orderId: order._id,
      amountPaise: order.amountPaise,
      lines,
      createdAt: moment().toDate()
    };

    // enqueue audit and return invoice
    await enqueueJob({
      type: JOB_TYPES.AUDIT_LOG,
      payload: {
        action: 'invoice.generated',
        entityType: 'Order',
        entityId: order._id
      },
      priority: 6
    });

    return invoice;
  }
}

module.exports = BillingService;
