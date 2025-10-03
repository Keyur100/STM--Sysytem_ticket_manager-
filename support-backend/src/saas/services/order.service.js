// src/saas/services/order.service.js
const Order = require('../models/order.model');
const CouponService = require('./coupon.service');
const Plan = require('../models/plan.model');
const Addon = require('../models/addon.model');
const { enqueueJob } = require('../libs/jobQueue');

class OrderService {
  // Create order for plan/addon/topup. Returns order + computed totals
  static async createOrder({ companyId, type, targetId, units = 1, couponCode = null, createdBy = null }) {
    let amountPaise = 0;
    if (type === 'PLAN') {
      const plan = await Plan.findById(targetId);
      if (!plan) throw new Error('Plan not found');
      amountPaise = plan.pricePaise || 0;
    } else if (type === 'ADDON') {
      const addon = await Addon.findById(targetId);
      if (!addon) throw new Error('Addon not found');
      amountPaise = (addon.pricePerUnitPaise || 0) * (units || 1);
    } else if (type === 'WALLET_TOPUP') {
      amountPaise = targetId; // treating targetId as amount in paise for topup simple api
    }

    // coupon
    let discountPaise = 0;
    if (couponCode) {
      const couponRes = await CouponService.validateAndComputeDiscount({ code: couponCode, amountPaise, companyId, type, targetId });
      if (!couponRes.ok) throw new Error('Coupon invalid: ' + couponRes.reason);
      discountPaise = couponRes.discountPaise || 0;
    }

    const finalAmount = Math.max(0, amountPaise - discountPaise);

    const order = await Order.create({
      company: companyId,
      type,
      targetId: type === 'WALLET_TOPUP' ? null : targetId,
      amountPaise: finalAmount,
      couponCode,
      status: 'PENDING',
      meta: { units },
      createdBy
    });

    // enqueue audit/order created
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'order.create', entityType: 'Order', entityId: order._id, companyId }, priority: 5 });
    await enqueueJob({ type: 'order.created', payload: { orderId: order._id }, priority: 3 });

    return { order, amountPaise, discountPaise, finalAmount };
  }

  static async markPaid(orderId, paymentId) {
    const order = await Order.findByIdAndUpdate(orderId, { status: 'PAID' }, { new: true });
    await enqueueJob({ type: 'order.paid', payload: { orderId, paymentId }, priority: 5 });
    return order;
  }

  static async cancelOrder(orderId) {
    const order = await Order.findByIdAndUpdate(orderId, { status: 'CANCELLED' }, { new: true });
    await enqueueJob({ type: 'order.cancelled', payload: { orderId }, priority: 6 });
    return order;
  }
}

module.exports = OrderService;
