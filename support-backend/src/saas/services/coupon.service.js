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

  static async getAll(q = {}) {
    const filter = {};

    // Fetch global coupons if companyId is not specified
    const globalCoupons = await Coupon.find({ companyId: null }).sort({
      createdAt: -1,
    });
    const companyCoupons = await Coupon.find(filter).sort({ createdAt: -1 });

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
    const now = new Date();
    const coupon = await Coupon.findOne({
      code: String(code || ""),
    });
    if (!coupon) throw new Error("Invalid coupon");

    if (coupon.validFrom && now < coupon.validFrom)
      throw new Error("Coupon not active yet");
    if (coupon.validTo && now > coupon.validTo)
      throw new Error("Coupon expired");
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) //todo deduct -and reduce reset token time for hack
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
    if (coupon.type === CouponType.PERCENT) {
      discountPaise = Math.floor((amountPaise * coupon.value) / 100);
    } else {
      discountPaise = Math.floor(coupon.value);
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
