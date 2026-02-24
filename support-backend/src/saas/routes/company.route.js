// src/saas/routes/company.route.js
const router = require("express").Router();
const companyController = require("../controllers/company.controller");
const syncController = require("../controllers/sync.controller");
const  authJwt  = require("../../middlewares/authJwt");
const rbac = require("../../middlewares/rbac");
const tryCatch = require("../../middlewares/tryCatch");
const validation = require("../../middlewares/validation");

const companyValidator = require("../validators/company.validator");

// Signup company
router.post(
  "/signup",
  authJwt,
  rbac("company_create"),
  validation(companyValidator.create),
  tryCatch(companyController.signup)
);

router.post(
  "/draft",
  authJwt,
  rbac("company_create"),
  tryCatch(companyController.draft)
);
// Get single company
router.get(
  "/:companyId",
  authJwt,
  rbac("company_read"),
  tryCatch(companyController.get)
);

router.get("/:companyId/details", authJwt, rbac("company_view"), companyController.getCompanyDetails);

// Get company full details (plan, orders, payments, wallet, transactions)
router.get("/:companyId/full-details", authJwt, rbac("company_view"), tryCatch(companyController.getFullDetails));

// Get company transactions
router.get("/:companyId/transactions", authJwt, rbac("company_view"), tryCatch(companyController.getTransactions));

// Get company payment history
router.get("/:companyId/payment-history", authJwt, rbac("company_view"), tryCatch(companyController.getPaymentHistory));

// Record cash payment for company subscription
router.post(
  "/:companyId/record-cash-payment",
  authJwt,
  rbac("saas.company_record_payment"),
  tryCatch(companyController.recordCashPayment)
);

// Sync company data to 3rd-party Laravel API (encrypted)
router.post(
  "/:companyId/sync",
  authJwt,
  rbac("company_update"),
  tryCatch(syncController.syncCompany)
);

// Sync step (1,2,3) - triggers per-step remote calls and logs
router.post(
  "/:companyId/sync/step/:step",
  authJwt,
  rbac("company_update"),
  tryCatch(syncController.syncStep)
);

// Get sync logs for a company
router.get(
  "/:companyId/sync/logs",
  authJwt,
  rbac("company_view"),
  tryCatch(syncController.getSyncLogs)
);

// Public webhook receiver for remote system callbacks
router.post("/sync/webhook", tryCatch(syncController.webhookHandler));

// Upgrade subscription
router.post(
  "/subscriptions/:subscriptionId/upgrade",
  authJwt,
  rbac("saas.subscription_upgrade"),
  tryCatch(companyController.upgradeSubscription)
);

// Reactivate subscription
router.post(
  "/subscriptions/:subscriptionId/reactivate",
  authJwt,
  rbac("saas.subscription_reactivate"),
  tryCatch(companyController.reactivateSubscription)
);

// Update company
router.put(
  "/:companyId",
  authJwt,
  rbac("company_update"),
  validation(companyValidator.update),
  tryCatch(companyController.update)
);

// List companies with pagination, search, sorting
router.get(
  "/",
  authJwt,
  rbac("company_read"),
  validation(companyValidator.list),
  tryCatch(companyController.list)
);

// Soft delete company (and cascade soft-delete related records)
router.delete(
  "/:companyId",
  authJwt,
  rbac("company.delete"),
  tryCatch(companyController.deleteCompany)
);

// List soft-deleted companies (recycle bin)
router.get(
  "/recycle",
  authJwt,
  rbac("company.read"),
  tryCatch(companyController.listDeletedCompanies)
);

// Restore soft-deleted company
router.post(
  "/:companyId/restore",
  authJwt,
  rbac("company.update"),
  tryCatch(companyController.restoreCompany)
);

module.exports = router;
