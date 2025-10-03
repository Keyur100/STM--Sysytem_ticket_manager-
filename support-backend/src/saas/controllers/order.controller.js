// src/saas/controllers/order.controller.js
const Order = require('../models/order.model');

exports.getOrders = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const orders = await Order.find({ company: companyId }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
