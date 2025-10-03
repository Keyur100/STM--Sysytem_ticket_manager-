// src/saas/models/payment.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { PaymentMethod, PaymentStatus } = require('../constants/payment.constant');

const PaymentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  amountPaise: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: Object.values(PaymentMethod), required: true },
  status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING, index: true },
  transactionId: { type: String, index: true, sparse: true },
  providerResponse: { type: Schema.Types.Mixed },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

PaymentSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
