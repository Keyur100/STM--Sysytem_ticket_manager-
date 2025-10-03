// src/saas/controllers/cart.controller.js
const Cart = require('../models/cart.model');
const OrderService = require('../services/order.service');

exports.getCart = async (req, res) => {
  const companyId = req.params.companyId;
  const cart = await Cart.findOne({ company: companyId });
  res.json({ success: true, cart });
};

exports.addToCart = async (req, res) => {
  const companyId = req.params.companyId;
  const { itemType, itemId, units = 1 } = req.body;
  let cart = await Cart.findOne({ company: companyId });
  if (!cart) cart = await Cart.create({ company: companyId, items: [] });
  cart.items.push({ itemType, itemId, units });
  await cart.save();
  res.json({ success: true, cart });
};

exports.checkoutCart = async (req, res) => {
  const companyId = req.params.companyId;
  const cart = await Cart.findOne({ company: companyId });
  if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Cart empty' });
  const createdOrders = [];
  for (const it of cart.items) {
    const { order } = await OrderService.createOrder({ companyId, type: it.itemType, targetId: it.itemId, units: it.units, createdBy: req.user && req.user._id });
    createdOrders.push(order);
  }
  cart.items = [];
  await cart.save();
  res.json({ success: true, orders: createdOrders });
};
