const CouponService = require("../services/coupon.service");
const { sendSuccess, sendError } = require("../../utils/response");

exports.create = async (req, res) => {
  const coupon = await CouponService.create(req.body, req.user?._id);
  return sendSuccess(res, coupon, "Coupon created successfully");
};

exports.getAll = async (req, res) => {
  const userCompanyId = req.params?.companyId;
  const planCode = req.query?.planCode; // Get planCode from query parameters
  
  try {
    console.log("CouponController.getAll - planCode:", planCode);
    const data = await CouponService.getAll(req.query, planCode);
    return sendSuccess(res, data, "Coupons fetched successfully");
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Error fetching coupons." });
  }
};

exports.getAllCoupon = async (req, res) => {
  try {
    const data = await CouponService.getAll({});
    return sendSuccess(res, data, "Coupons fetched successfully");
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Error fetching coupons." });
  }
};

exports.getById = async (req, res) => {
  const coupon = await CouponService.getById(req.params.id);
  return sendSuccess(res, coupon);
};

exports.update = async (req, res) => {
  const coupon = await CouponService.update(req.params.id, req.body, req.user?._id);
  return sendSuccess(res, coupon, "Coupon updated successfully");
};

exports.remove = async (req, res) => {
  await CouponService.remove(req.params.id);
  return sendSuccess(res, null, "Coupon deleted successfully");
};

// ✅ Apply coupon validation
exports.applyCoupon = async (req, res) => {
  const { code, planCode, amountPaise } = req.body;
  const result = await CouponService.validateAndApply(code, planCode, amountPaise);
  // Increment usage when coupon is actually applied via API
  try {
    await CouponService.incrementUsage(result.coupon.code);
  } catch (e) {
    console.error('Failed to increment coupon usage:', e);
  }
  return sendSuccess(res, result, "Coupon applied successfully");
};
