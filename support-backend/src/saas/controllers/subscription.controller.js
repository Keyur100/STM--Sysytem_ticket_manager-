// src/saas/controllers/subscription.controller.js
const SubscriptionService = require('../services/subscription.service');
const OrderService = require('../services/order.service');
const PaymentService = require('../services/payment.service');
const { PaymentMethod } = require('../constants/saas.constant');

exports.buyPlan = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { planCode, method = PaymentMethod.CARD, couponCode } = req.body;
    const Plan = require('../models/plan.model');
    const plan = await Plan.findOne({ code: planCode });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { order } = await OrderService.createOrder({ companyId, type: 'PLAN', targetId: plan._id, couponCode, createdBy: req.user && req.user._id });

    const payment = await PaymentService.createPayment({ orderId: order._id, companyId, amountPaise: order.amountPaise, method, createdBy: req.user && req.user._id });

    if (method === PaymentMethod.OFFLINE) {
      return res.json({ success: true, message: 'Order created; awaiting offline payment confirmation by admin.', order, payment });
    }

    // For demo assume gateway success -> in prod, webhook will call PaymentService.markOnlinePaymentSuccess
    const paid = await PaymentService.markOnlinePaymentSuccess(payment._id, 'TX_DEMO_' + Date.now(), { demo: true });
    return res.json({ success: true, payment: paid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.upgrade = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { newPlanCode, proRate = false, autoPayMethod = null } = req.body;
    const sub = await SubscriptionService.upgradePlan(companyId, newPlanCode, { proRate, autoPayMethod, createdBy: req.user && req.user._id });
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.scheduleDowngrade = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { targetPlanCode } = req.body;
    const sub = await SubscriptionService.scheduleDowngrade(companyId, targetPlanCode);
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
