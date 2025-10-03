// const express = require('express');
// const router = express.Router();

// const companyCtrl = require('../controllers/company.controller');
// const subscriptionCtrl = require('../controllers/subscription.controller');
// const addonCtrl = require('../controllers/addon.controller');
// const paymentCtrl = require('../controllers/payment.controller');
// const orderCtrl = require('../controllers/order.controller');
// const walletCtrl = require('../controllers/wallet.controller');
// const cartCtrl = require('../controllers/cart.controller');
// const healthCtrl = require('../controllers/health.controller');

// const { enqueueJob } = require('../libs/jobQueue');

// const authJwt = require('../../middlewares/authJwt');
// const rbac = require('../../middlewares/rbac');
// const validation = require('../../middlewares/validation');
// const tryCatch = require('../../middlewares/tryCatch');

// // Validators
// const companyCreateValidator = require('../validators/company.create');
// const subscriptionBuyValidator = require('../validators/subscription.buy');
// const addonBuyValidator = require('../validators/addon.buy');
// const walletTopupValidator = require('../validators/wallet.topup');

// // ------------------- COMPANY -------------------
// router.post('/company/signup', validation(companyCreateValidator), tryCatch(companyCtrl.signup)); // open
// router.get('/company/:companyId', authJwt, rbac('company.read'), tryCatch(companyCtrl.get));

// // ------------------- SUBSCRIPTION -------------------
// router.post('/company/:companyId/subscription/buy',
//   authJwt, rbac('subscription.buy'), validation(subscriptionBuyValidator), tryCatch(subscriptionCtrl.buyPlan));

// router.post('/company/:companyId/subscription/upgrade',
//   authJwt, rbac('subscription.upgrade'), tryCatch(subscriptionCtrl.upgrade));

// router.post('/company/:companyId/subscription/schedule-downgrade',
//   authJwt, rbac('subscription.update'), tryCatch(subscriptionCtrl.scheduleDowngrade));

// // ------------------- ADDON -------------------
// router.post('/company/:companyId/addons/buy',
//   authJwt, rbac('addon.buy'), validation(addonBuyValidator), tryCatch(addonCtrl.buyAddon));

// // ------------------- PAYMENT -------------------
// router.post('/payments/webhook', tryCatch(paymentCtrl.gatewayWebhook));
// router.post('/payments/approve-offline',
//   authJwt, rbac('payment.approve'), tryCatch(paymentCtrl.approveOffline));

// // ------------------- ORDERS -------------------
// router.get('/company/:companyId/orders',
//   authJwt, rbac('order.read'), tryCatch(orderCtrl.getOrders));

// // ------------------- WALLET -------------------
// router.get('/company/:companyId/wallet',
//   authJwt, rbac('wallet.read'), tryCatch(walletCtrl.getBalance));

// router.post('/company/:companyId/wallet/topup',
//   authJwt, rbac('wallet.topup'), validation(walletTopupValidator), tryCatch(walletCtrl.topup));

// // ------------------- CART -------------------
// router.get('/company/:companyId/cart',
//   authJwt, rbac('cart.read'), tryCatch(cartCtrl.getCart));

// router.post('/company/:companyId/cart',
//   authJwt, rbac('cart.update'), tryCatch(cartCtrl.addToCart));

// router.post('/company/:companyId/cart/checkout',
//   authJwt, rbac('cart.checkout'), tryCatch(cartCtrl.checkoutCart));

// // ------------------- WORKER TRIGGERS -------------------
// // Example endpoint to enqueue a worker job manually (optional)
// router.post('/worker/enqueue/:type', authJwt, rbac('worker.enqueue'), tryCatch(async (req, res) => {
//   const { type, payload, priority } = req.body;
//   const job = await enqueueJob({ type, payload, priority });
//   res.json({ success: true, job });
// }));

// // ------------------- HEALTH -------------------
// router.get('/health/ping', tryCatch(healthCtrl.ping));

// module.exports = router;


const express = require("express");
const router = express.Router();

// Import all SaaS subroutes
const companyRoutes = require("./company.route");
const planRoutes = require("./plan.route");
const subscriptionRoutes = require("./subscription.route");
const walletRoutes = require("./wallet.route");
const addonRoutes = require("./addon.route");

// Attach with prefixes
router.use("/company", companyRoutes);
router.use("/plan", planRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/wallets", walletRoutes);
router.use("/addons", addonRoutes);
router.use("/module", require("./module.route"));

module.exports = router;
