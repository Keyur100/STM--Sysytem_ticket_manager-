import express from "express";
import {
  initiatePayment,
  verifyPayment,
  cancelPayment,
  webhook,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/initiate", initiatePayment);
router.post("/verify", verifyPayment);
router.post("/cancel/:orderId", cancelPayment);
// router.post("/coupon/apply", applyCoupon);
// razorpay webhook (no auth)
router.post('/webhook', tryCatch(webhook));
export default router;
