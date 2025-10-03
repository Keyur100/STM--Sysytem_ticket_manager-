// src/saas/routes/plan.route.js
const router = require("express").Router();
const planController = require("../controllers/plan.controller");
const authJwt = require("../../middlewares/authJwt");
const rbac = require("../../middlewares/rbac");
const tryCatch = require("../../middlewares/tryCatch");
const validation = require("../../middlewares/validation");

const planValidator = require("../validators/plan.validator.js");

/**
 * 🧩 Create new plan
 */
router.post(
  "/",
  authJwt,
  rbac("plan_create"),
  validation(planValidator.create),
  tryCatch(planController.createPlan)
);

/**
 * 📋 Get all plans (with filters, pagination)
 */
router.get(
  "/",
  authJwt,
  rbac("plan_list"),
  validation(planValidator.list),
  tryCatch(planController.getAllPlans)
);

/**
 * 🔍 Get plan by code
 */
router.get(
  "/:code",
  authJwt,
  rbac("plan_read"),
  tryCatch(planController.getPlanByCode)
);

/**
 * ✏️ Update plan by ID
 */
router.put(
  "/:id",
  authJwt,
  rbac("plan_update"),
  validation(planValidator.update),
  tryCatch(planController.updatePlan)
);

/**
 * ❌ Delete plan by ID
 */
router.delete(
  "/:id",
  authJwt,
  rbac("plan_delete"),
  tryCatch(planController.deletePlan)
);

module.exports = router;
