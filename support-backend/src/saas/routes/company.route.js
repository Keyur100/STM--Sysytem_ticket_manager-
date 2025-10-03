// src/saas/routes/company.route.js
const router = require("express").Router();
const companyController = require("../controllers/company.controller");
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

// Get single company
router.get(
  "/:companyId",
  authJwt,
  rbac("company_read"),
  tryCatch(companyController.get)
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

module.exports = router;
