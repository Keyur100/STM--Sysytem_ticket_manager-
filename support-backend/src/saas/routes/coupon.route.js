// const router = require("express").Router();
// const couponController = require("../controllers/coupon.controller");
// const authJwt = require("../../middlewares/authJwt");
// const rbac = require("../../middlewares/rbac");
// const tryCatch = require("../../middlewares/tryCatch");
// const validation = require("../../middlewares/validation");
// const couponValidator = require("../validators/coupon.validator");

// // Create coupon
// router.post(
//   "/",
//   authJwt,
//   rbac("coupon_create"),
//   validation(couponValidator.create),
//   tryCatch(couponController.create)
// );

// // Get all coupons (with filters)
// router.get(
//   "/",
//   authJwt,
//   rbac("coupon_view"),
//   tryCatch(couponController.getAll)
// );

// // Get coupon by ID
// router.get(
//   "/:id",
//   authJwt,
//   rbac("coupon_view"),
//   tryCatch(couponController.getById)
// );

// // Update coupon
// router.put(
//   "/:id",
//   authJwt,
//   rbac("coupon_update"),
//   validation(couponValidator.update),
//   tryCatch(couponController.update)
// );

// // Delete coupon
// router.delete(
//   "/:id",
//   authJwt,
//   rbac("coupon_delete"),
//   tryCatch(couponController.remove)
// );

// // Validate & Apply coupon (for payment/plan)
// router.post(
//   "/apply",
//   authJwt,
//   tryCatch(couponController.applyCoupon)
// );

// module.exports = router;
const router = require('express').Router();
const couponController = require('../controllers/coupon.controller');
const authJwt = require('../../middlewares/authJwt');
const tryCatch = require('../../middlewares/tryCatch');

router.get('/get-perticular/:companyId', authJwt, tryCatch(couponController.getAll));
router.post('/', authJwt, tryCatch(couponController.create));
router.get('/', authJwt, tryCatch(couponController.getAllCoupon));

router.post('/apply', authJwt, tryCatch(couponController.applyCoupon));

module.exports = router;
