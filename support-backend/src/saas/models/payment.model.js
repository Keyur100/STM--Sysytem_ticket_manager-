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
  status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.CREATED, index: true },
  transactionId: { type: String, index: true, sparse: true },//Transaction reference from payment gateway (e.g., Razorpay/Stripe)
  providerResponse: { type: Schema.Types.Mixed },
  approvedBy: { type: Schema.Types.ObjectId, ref: "UserAuth", sparse: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "UserAuth" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "UserAuth" }

}, { timestamps: true });

PaymentSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);

// Actual Price (Original Price)

// Subtract Coupon Discount

// Subtract Wallet Balance

// Store the Final Amount the user has to pay.

// tax , vurrency in INR