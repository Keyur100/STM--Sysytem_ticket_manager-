// src/saas/services/coupon.service.js
const Coupon = require('../models/coupon.model');
const { enqueueJob } = require('../libs/jobQueue');
const { JOB_TYPES } = require('../constants/job.constant');
const moment = require('moment');

class CouponService {
  /**
   * Validate coupon and compute discount in paise for a given amountPaise
   * Returns { ok: boolean, discountPaise, reason? }
   */
  static async validateAndComputeDiscount({ code, amountPaise = 0, companyId = null, type = null, targetId = null }) {
    if (!code) return { ok: false, reason: 'NO_CODE' };

    const coupon = await Coupon.findOne({ code });
    if (!coupon) return { ok: false, reason: 'INVALID_CODE' };

    const now = moment();

    // Validate coupon validity period
    if (coupon.validFrom && now.isBefore(moment(coupon.validFrom)))
      return { ok: false, reason: 'NOT_STARTED' };

    if (coupon.validTo && now.isAfter(moment(coupon.validTo)))
      return { ok: false, reason: 'EXPIRED' };

    if (coupon.maxUses && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
      return { ok: false, reason: 'USED_UP' };

    if (coupon.minSpendPaise && amountPaise < coupon.minSpendPaise)
      return { ok: false, reason: 'MIN_SPEND_NOT_MET' };

    // plan/addon specific eligibility
    if (coupon.eligiblePlanCodes && coupon.eligiblePlanCodes.length && type === 'PLAN') {
      const Plan = require('../models/plan.model');
      const plan = await Plan.findById(targetId).lean();
      if (!plan || !coupon.eligiblePlanCodes.includes(plan.code))
        return { ok: false, reason: 'PLAN_NOT_ELIGIBLE' };
    }

    // Compute discount
    let discountPaise = 0;
    if (coupon.type === 'PERCENT') {
      discountPaise = Math.round((amountPaise * coupon.value) / 100);
    } else {
      // FIXED (assume paise)
      discountPaise = coupon.value;
    }

    // Clamp discount not to exceed total
    discountPaise = Math.min(discountPaise, amountPaise);

    return { ok: true, discountPaise, couponId: coupon._id };
  }

  /**
   * Record coupon usage (atomic)
   */
  static async recordUsage(couponId, increment = 1) {
    const res = await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        $or: [{ maxUses: 0 }, { $expr: { $gt: ['$maxUses', '$usedCount'] } }]
      },
      { $inc: { usedCount: increment } },
      { new: true }
    );

    if (res) {
      await enqueueJob({
        type: JOB_TYPES.AUDIT_LOG,
        payload: { action: 'coupon.used', couponId },
        priority: 9
      });
      return { ok: true, coupon: res };
    }

    return { ok: false, reason: 'USAGE_LIMIT_REACHED' };
  }

  /**
   * Create new coupon
   */
  static async createCoupon(payload, createdBy = null) {
    const coupon = await Coupon.create({
      ...payload,
      createdBy
    });

    await enqueueJob({
      type: JOB_TYPES.AUDIT_LOG,
      payload: { action: 'coupon.create', couponId: coupon._id },
      priority: 9
    });

    return coupon;
  }

  /**
   * Get coupon by code
   */
  static async getCoupon(code) {
    return Coupon.findOne({ code }).lean();
  }

  /**
   * List all coupons with pagination
   */
  static async list({ filter = {}, skip = 0, limit = 50 } = {}) {
    const q = Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const [data, total] = await Promise.all([
      q.lean(),
      Coupon.countDocuments(filter)
    ]);

    return {
      data,
      total,
      skip: Number(skip),
      limit: Number(limit)
    };
  }
}

module.exports = CouponService;
