// src/saas/models/coupon.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CouponType } = require('../constants/coupon.constant');

const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  description: String,
  type: { type: String, enum: Object.values(CouponType), required: true },
  value: { type: Number, required: true }, // percent (0-100) or fixed paise
  minSpendPaise: { type: Number, default: 0 },
  maxUses: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  validFrom: Date,
  validTo: Date,
  eligiblePlanCodes: [String], // restrict to specific plans if needed
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false }, // optional, if company-specific
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
   isSystem: { type: Boolean, default: false, index: true },

}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
