const PaymentService = require('../services/payment.service');
const { sendSuccess, sendError } = require('../../utils/response');
const companyModel = require('../models/company.model');

exports.createOrder = async (req, res) => {
  try {
    const { type, targetId, amountPaise, paymentMethod, couponCode, renewalType, meta } = req.body;
    const companyId = req.body.companyId || req.user.company; // adapt as per your auth
    const createdBy = req.user?._id;
    const {plan} = (await companyModel.findById(companyId, 'plan').lean());
    const result = await PaymentService.createOrderAndPayment({ companyId, type, targetId, amountPaise, paymentMethod, couponCode, renewalType, createdBy, meta,plan });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

exports.verifyClient = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await PaymentService.verifyRazorpayPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

// Webhook endpoint (no auth)
exports.webhook = async (req, res) => {
  try {
    await PaymentService.handleWebhook(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;
    const order = await PaymentService.cancelOrder(orderId, userId);
    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};
