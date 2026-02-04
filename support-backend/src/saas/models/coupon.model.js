// src/saas/models/coupon.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CouponType } = require('../constants/coupon.constant');

const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  description: String,

  minSpendPaise: { type: Number, default: 0 },
  validFrom: Number,
  validTo: Number,

  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false }, // optional, if company-specific
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  isSystem: { type: Boolean, default: false, index: true },
  // UPDATED
   // usage tracking to enable atomic increments and caps
  usedCount: { type: Number, default: 0 },
  discountType: { type: String, enum: Object.values(CouponType), required: true },
  discountValue: { type: Number, required: true }, // percent (0-100) or fixed paise
  maxDiscountPaise: Number,
  // NOT NEEDED
  // maxUses: { type: Number, default: 0 }, // 0 = unlimited
  // ADDED V2
  isActive: Boolean,
  appliesTo: { type: String, enum: ['PLAN','ADDON','ALL'], default: 'PLAN' },
  maxUses: { type: Number, default: null }, //0= Unlimited use
    // per-company usage map: { '<companyId>': Number }
  // usagePerCompany: { type: Schema.Types.Mixed, default: {} },
  // maxUsagePerCompany: { type: Number, default: null },

  // ADDED V1
  eligiblePlanCodes: [String], // restrict to specific plans if needed

}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
