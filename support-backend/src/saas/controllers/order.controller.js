// src/saas/controllers/order.controller.js
const Order = require('../models/order.model');

/**
 * Get all orders for a company
 * Query params: companyId (required), status[] (optional array), limit (optional)
 * Note: This is ORDER payment status (pending, paid, partially_paid, etc)
 *       NOT company subscription status (draft, active, expired, etc)
 */
exports.getAll = async (req, res) => {
  try {
    const { companyId, status, limit = 100 } = req.query;

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'companyId is required' 
      });
    }

    const query = { companyId };

    // Handle status array from query params
    if (status) {
      let statusArray = Array.isArray(status) ? status : [status];
      
      // Map frontend status names to Order model enum values
      // "partial" from frontend -> "partially_paid" in database
      statusArray = statusArray.map(s => {
        if (s === 'partial') return 'partially_paid';
        return s;
      });
      
      query.status = { $in: statusArray };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: orders,
      items: orders
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/**
 * Get orders by company ID (from params)
 */
exports.getOrders = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const orders = await Order.find({ companyId }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Create a new order
 */
exports.create = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ 
      success: true, 
      data: order,
      message: 'Order created successfully'
    });
  } catch (err) {
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};
