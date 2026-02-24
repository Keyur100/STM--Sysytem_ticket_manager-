const express = require("express");
const router = express.Router();

// Import all SaaS subroutes
const companyRoutes = require("./company.route");
const planRoutes = require("./plan.route");
const subscriptionRoutes = require("./subscription.route");
const walletRoutes = require("./wallet.route");
const addonRoutes = require("./addon.route");
const orderRoutes = require("./order.route");
const ticketSyncRoutes = require("./ticketSync.route");
const branchRoutes = require("./branch.route");

// Attach with prefixes
router.use("/company", companyRoutes);
router.use("/plan", planRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/wallet", walletRoutes);
router.use("/addons", addonRoutes);
router.use("/order", orderRoutes);
router.use("/ticket-sync", ticketSyncRoutes);
router.use("/branch", branchRoutes);
router.use("/module", require("./module.route"));
router.use("/coupons", require("./coupon.route"));

module.exports = router;
