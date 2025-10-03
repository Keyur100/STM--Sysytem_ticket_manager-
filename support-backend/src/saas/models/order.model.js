// src/saas/models/order.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { OrderStatus } = require('../constants/saas.constant');

const OrderSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  type: { type: String, enum: ['PLAN','ADDON','WALLET_TOPUP'], required: true },
  targetId: { type: Schema.Types.ObjectId }, // planId or addonId or null for topup
  amountPaise: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  couponCode: { type: String },
  status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
  meta: { type: Schema.Types.Mixed },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
