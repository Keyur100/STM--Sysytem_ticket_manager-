// src/saas/controllers/payment.controller.js
const PaymentService = require('../services/payment.service');

exports.gatewayWebhook = async (req, res) => {
  try {
    const { paymentId, status, txId, providerResponse } = req.body;
    if (status === 'success') {
      const payment = await PaymentService.markOnlinePaymentSuccess(paymentId, txId, providerResponse);
      return res.json({ success: true, payment });
    } else {
      await PaymentService.markPaymentFailed(paymentId, providerResponse && providerResponse.failReason);
      return res.json({ success: false, message: 'Payment failed' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveOffline = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const adminId = req.user._id;
    const result = await PaymentService.approveOffline(paymentId, adminId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
