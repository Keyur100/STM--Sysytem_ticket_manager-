// src/saas/seed/data/coupons.data.js

const { CouponType } = require("../../constants/saas.constant");

const couponData = [
  {
    code: "WELCOME10",
    description: "10% off on first purchase",
    type: CouponType.PERCENT, // Assuming CouponType.PERCENT exists
    value: 10,
    minSpendPaise: 50000, // min spend of 500 INR (in paise)
    maxUses: 100,
    usedCount: 0,
    validFrom: new Date("2025-01-01"),
    validTo: new Date("2025-12-31"),
    eligiblePlanCodes: ["BASIC_MONTHLY_XS", "BASIC_MONTHLY_S"], // eligible for XS and S plans
    companyId: null, // Global coupon
    createdBy: null, // Will be updated dynamically in seed script
    isSystem: true, // Marked as system coupon
  },
  {
    code: "SAVE500",
    description: "Save ₹500 on any plan above ₹5000",
    type: CouponType.FIXED, // Assuming CouponType.FIXED exists
    value: 50000, // fixed value of 500 INR (in paise)
    minSpendPaise: 500000, // min spend of ₹5000
    maxUses: 50,
    usedCount: 0,
    validFrom: new Date("2025-02-01"),
    validTo: new Date("2025-12-31"),
    eligiblePlanCodes: ["BASIC_MONTHLY_M", "BASIC_MONTHLY_L", "BASIC_MONTHLY_XL"],
    companyId: null, // Global coupon
    createdBy: null, // Will be updated dynamically in seed script
    isSystem: true, // Marked as system coupon
  },
  {
    code: "CORP_DISCOUNT",
    description: "Corporate customers get 20% off",
    type: CouponType.PERCENT,
    value: 20,
    minSpendPaise: 0,
    maxUses: 0, // Unlimited use
    usedCount: 0,
    validFrom: new Date("2025-01-01"),
    validTo: new Date("2025-12-31"),
    eligiblePlanCodes: ["BASIC_MONTHLY_XL", "BASIC_MONTHLY_XXL"],
    companyId: null, // Global coupon
    createdBy: null, // Will be updated dynamically in seed script
    isSystem: true, // Marked as system coupon
  },
  {
    code: "TRIALPLAN15",
    description: "Get ₹150 off on Trial XS plan",
    type: CouponType.FIXED,
    value: 15000, // ₹150 (in paise)
    minSpendPaise: 0,
    maxUses: 200,
    usedCount: 0,
    validFrom: new Date("2025-01-01"),
    validTo: new Date("2025-06-30"),
    eligiblePlanCodes: ["TRIAL_XS"], // Only valid for TRIAL_XS
    companyId: null, // Global coupon
    createdBy: null, // Will be updated dynamically in seed script
    isSystem: true, // Marked as system coupon
  },
  {
    code: "BASIC_YEARLY_XXXL155",
    description: "Get ₹150 off on Trial XS plan",
    type: CouponType.FIXED,
    value: 15000, // ₹150 (in paise)
    minSpendPaise: 0,
    maxUses: 200,
    usedCount: 0,
    validFrom: new Date("2025-01-01"),
    validTo: new Date("2025-12-30"),
    eligiblePlanCodes: ["BASIC_YEARLY_XXXL"], // Only valid for TRIAL_XS
    companyId: null, // Global coupon
    createdBy: null, // Will be updated dynamically in seed script
    isSystem: true, // Marked as system coupon
  },
];

module.exports = couponData;
