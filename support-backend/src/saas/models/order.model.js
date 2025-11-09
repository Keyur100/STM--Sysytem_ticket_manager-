const mongoose = require('mongoose');
const { Schema } = mongoose;
const { OrderStatus } = require('../constants/saas.constant');

const OrderSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  type: { type: String, enum: ['PLAN', 'ADDON', 'WALLET_TOPUP'], required: true },
  targetId: { type: Schema.Types.ObjectId },// planId or addonId or null for topup --TODO Subscription attch?
  amountPaise: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  couponCode: { type: String },
  renewalType: { type: String, enum: ['NEW','RENEWAL','UPGRADE','DOWNGRADE'], default: 'NEW' },
  status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
  payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
  meta: { type: Schema.Types.Mixed },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
