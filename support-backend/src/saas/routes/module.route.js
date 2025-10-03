const router = require("express").Router();
const moduleController = require("../controllers/module.controller");
const authJwt = require("../../middlewares/authJwt");
const rbac = require("../../middlewares/rbac");
const tryCatch = require("../../middlewares/tryCatch");
const validation = require("../../middlewares/validation");
const moduleValidator = require("../validators/module.validator.js");

/**
 * 🧩 Module Management Routes
 */

// ➕ Create new module
router.post(
  "/",
  authJwt,
  rbac("module_create"),
  validation(moduleValidator.create),
  tryCatch(moduleController.create)
);

// 📋 Get all modules (with optional filters/pagination)
router.get(
  "/",
  authJwt,
  rbac("module_list"),
  validation(moduleValidator.list),
  tryCatch(moduleController.getAll)
);

// 🔍 Get single module by ID
router.get(
  "/:id",
  authJwt,
  rbac("module_read"),
  tryCatch(moduleController.getById)
);

// ✏️ Update module
router.put(
  "/:id",
  authJwt,
  rbac("module_update"),
  validation(moduleValidator.update),
  tryCatch(moduleController.update)
);

// ❌ Delete module
router.delete(
  "/:id",
  authJwt,
  rbac("module_delete"),
  tryCatch(moduleController.remove)
);

module.exports = router;
