const Coupon = require('../models/coupon.model');
const { CouponType } = require('../constants/saas.constant');
// const { AppError } = require('../../utils/error');

class CouponService {
  static async create(payload, userId) {
    payload.code = String(payload.code || "")
      .trim()
      .toUpperCase();
    const exists = await Coupon.findOne({ code: payload.code });
    if (exists) throw new Error("Coupon already exists");
    return Coupon.create({ ...payload, createdBy: userId });
  }

  static async getAll(q = {}, planCode = null) {
    console.log("CouponService.getAll called with planCode:", planCode);
    
    // Build filter for plan-specific coupons
    // If planCode provided, only show coupons that either:
    // 1. Have no eligiblePlanCodes restriction (global coupons)
    // 2. Include this planCode in their eligiblePlanCodes array
    const planFilter = planCode 
      ? {
          $or: [
            { eligiblePlanCodes: { $size: 0 } },           // No restrictions
            { eligiblePlanCodes: { $in: [planCode] } }     // This plan code is eligible
          ]
        }
      : {};
    
    // Fetch global coupons (no company, no plan restriction)
    const globalCoupons = await Coupon.find({ 
      companyId: null,
      ...planFilter
    }).sort({
      createdAt: -1,
    });
    
    // Fetch company coupons (specific to companies)
    const companyCoupons = await Coupon.find({
      ...planFilter
    }).sort({ createdAt: -1 });

    console.log("Global coupons found:", globalCoupons.length);
    console.log("Company coupons found:", companyCoupons.length);
    console.log("Filtered coupons:", { globalCoupons, companyCoupons });

    return { globalCoupons, companyCoupons };
  }

  static async getAllCoupon(q = {}) {
    const filter = {};

    await Coupon.find(filter).sort({ createdAt: -1 });

    return { globalCoupons, companyCoupons };
  }

  static async getById(id) {
    return Coupon.findById(id);
  }

  static async update(id, payload, userId) {
    return Coupon.findByIdAndUpdate(
      id,
      { ...payload, updatedBy: userId },
      { new: true }
    );
  }

  static async remove(id) {
    const doc = await Coupon.findById(id);
    if (!doc) throw new Error("Not found");
    return doc.deleteOne();
  }

  static async validateAndApply(code, planCode, amountPaise) {
    const now = Date.now();
    const coupon = await Coupon.findOne({
      code: String(code || ""),
    }).lean()
    if (!coupon) throw new Error("Invalid coupon");

    if (coupon.validFrom && now < coupon.validFrom)
      throw new Error("Coupon not active yet");
    if (coupon.validTo && now > coupon.validTo)
      throw new Error("Coupon expired");
    if (coupon.usedCount >= coupon.maxUses) //todo deduct -and reduce reset token time for hack
      throw new Error("Coupon usage limit reached");
    if ((coupon.minSpendPaise || 0) > amountPaise)
      throw new Error("Minimum spend not met");
    if (
      coupon.eligiblePlanCodes &&
      coupon.eligiblePlanCodes.length &&
      (!planCode || !coupon.eligiblePlanCodes.includes(planCode))
    ) {
      throw new Error("Coupon not valid for this plan");
    }

    let discountPaise = 0;
    if (coupon.discountType === CouponType.PERCENT) {
      discountPaise = Math.floor((amountPaise * coupon.discountValue) / 100);
    } else {
      discountPaise = Math.floor(coupon.discountValue);
    }
    const finalAmount = Math.max(0, amountPaise - discountPaise);

    return {
      coupon,
      discountPaise,
      finalAmountPaise: finalAmount,
    };
  }

  static async incrementUsage(code) {
    return Coupon.findOneAndUpdate(
      { code: String(code || "").toUpperCase() },
      { $inc: { usedCount: 1 } },
      { new: true }
    );
  }
}

module.exports = CouponService;
