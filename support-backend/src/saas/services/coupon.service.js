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
    // Ensure fixed discount values are stored in paise
    if (payload.discountType !== CouponType.PERCENT) {
      payload.discountValue = Math.round(Number(payload.discountValue || 0) * 100);
    }
    return Coupon.create({ ...payload, createdBy: userId });
  }

  static async getAll(q = {}, planCode = null) {
    // Accept standard list params: page, limit, search, sortBy, sortOrder, companyId
    const page = parseInt(q.page || 1, 10) || 1;
    const limit = parseInt(q.limit || 20, 10) || 20;
    const search = (q.search || q.q || "").trim();
    const sortBy = q.sortBy || q.orderBy || "createdAt";
    const sortOrder = (q.sortOrder || q.order || "desc").toLowerCase() === "asc" ? 1 : -1;
    const companyId = q.companyId || null;

    const filter = {};
    if (companyId) {
      // support legacy `companyId` or new `companyIds` array
      filter.$or = [
        { companyId },
        {companyId: null}, // include global coupons when filtering by company];
    ]}

    // planCode filter: coupons with no restriction OR include this planCode
    if (planCode) {
      filter.$or = [
        { eligiblePlanCodes: { $size: 0 } },
        { eligiblePlanCodes: { $in: [planCode] } },
      ];
    }

    if (search) {
      filter.$or = filter.$or || [];
      filter.$or.push({ code: new RegExp(search, "i") }, { description: new RegExp(search, "i") });
    }

    const total = await Coupon.countDocuments(filter);
    const coupons = await Coupon.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // add scope for frontend convenience
    const mapped = (coupons || []).map(c => ({ ...c, scope: (c.companyId || (c.companyIds && c.companyIds.length)) ? 'Company' : 'Global' }));

    return { coupons: mapped, total, page, limit };
  }

  static async getAllCoupon(q = {}) {
    const filter = {};

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });

    const globalCoupons = coupons.filter(c => !(c.companyId || (c.companyIds && c.companyIds.length)));
    const companyCoupons = coupons.filter(c => (c.companyId || (c.companyIds && c.companyIds.length)));

    return { globalCoupons, companyCoupons };
  }

  static async getById(id) {
    return Coupon.findById(id);
  }

  static async update(id, payload, userId) {
    // Ensure fixed discount values are stored in paise
    if (payload.discountType && payload.discountType !== CouponType.PERCENT && payload.discountValue !== undefined) {
      payload.discountValue = Math.round(Number(payload.discountValue || 0) * 100);
    }
    // If coupon code is being updated, ensure uniqueness
    if (payload.code) {
      const exists = await Coupon.findOne({ code: payload.code, _id: { $ne: id } }).lean().catch(() => null);
      if (exists) throw new Error('Another coupon with same code already exists');
    }

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

  static async validateAndApply(code, planCode, amountPaise, companyId = null) {
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
    // Ensure maxUses is honoured only when set (>0)
    if (coupon.maxUses && Number(coupon.maxUses) > 0) {
      const used = Number(coupon.usedCount || 0);
      const max = Number(coupon.maxUses || 0);
      if (used >= max) throw new Error("Coupon usage limit reached");
    }
    if ((coupon.minSpendPaise || 0) > amountPaise)
      throw new Error("Minimum spend not met");
    if (
      coupon.eligiblePlanCodes &&
      coupon.eligiblePlanCodes.length &&
      (!planCode || !coupon.eligiblePlanCodes.includes(planCode))
    ) {
      throw new Error("Coupon not valid for this plan");
    }

    // Company-scoped validation: if coupon targets specific company(s), ensure request provides matching companyId
    if ((coupon.companyId || (coupon.companyIds && coupon.companyIds.length))) {
      // require companyId to be provided
      if (!companyId) throw new Error("Coupon not valid for this company");
      const companyMatch = (coupon.companyId && String(coupon.companyId) === String(companyId))
        || (coupon.companyIds && coupon.companyIds.map(String).includes(String(companyId)));
      if (!companyMatch) throw new Error("Coupon not valid for this company");
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
