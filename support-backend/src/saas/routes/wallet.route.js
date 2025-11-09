const express = require("express");
const router = express.Router();
const controller = require("../controllers/wallet.controller.js");

router.get("/:companyId", controller.getBalance);
router.post("/topup/:companyId", controller.topup);
router.post("/deduct/:companyId", controller.deduct);

router.get("/:companyId/transactions", controller.getTransactions);

module.exports = router;
