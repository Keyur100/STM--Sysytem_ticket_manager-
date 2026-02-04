// addon.route.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/addon.controller.js");
const authJwt = require("../../middlewares/authJwt");
const rbac = require("../../middlewares/rbac");
const tryCatch = require("../../middlewares/tryCatch");

/**
 * Get all add-ons (public, but requires read permission)
 */
router.get(
  "/",
  authJwt,
  rbac("addon_read"),
  tryCatch((req, res) => controller.getAll(req, res))
);

/**
 * Get specific add-on by ID
 */
router.get(
  "/:id",
  authJwt,
  rbac("addon_read"),
  tryCatch((req, res) => controller.getById(req, res))
);

/**
 * Create add-on (admin only)
 */
router.post(
  "/",
  authJwt,
  rbac("addon_create"),
  tryCatch((req, res) => controller.create?.(req, res))
);

/**
 * Update add-on
 */
router.put(
  "/:id",
  authJwt,
  rbac("addon_update"),
  tryCatch((req, res) => controller.update?.(req, res))
);

/**
 * Delete add-on
 */
router.delete(
  "/:id",
  authJwt,
  rbac("addon_delete"),
  tryCatch((req, res) => controller.delete?.(req, res))
);

/**
 * Buy add-on for a company
 */
router.post(
  "/:companyId/buy",
  authJwt,
  rbac("addon_buy"),
  tryCatch((req, res) => controller.buyAddon(req, res))
);

module.exports = router;
