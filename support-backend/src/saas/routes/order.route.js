// order.route.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/order.controller.js");
const tryCatch = require("../../middlewares/tryCatch");
const authJwt = require("../../middlewares/authJwt.js");
const rbac = require("../../middlewares/rbac");

// Get all orders (with query filters)
router.get("/", authJwt, rbac("saas.order_view"), tryCatch(controller.getAll));

// Get orders by company ID
router.get("/company/:companyId", authJwt, rbac("saas.order_view"), tryCatch(controller.getOrders));

// Create new order
router.post("/", authJwt, rbac("saas.order_create"), tryCatch(controller.create));

module.exports = router;
