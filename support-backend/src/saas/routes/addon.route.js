// addon.route.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/addon.controller.js");
const authJwt = require("../../middlewares/authJwt");
const tryCatch = require("../../middlewares/tryCatch");

// List all add-ons with pagination/search/sort
router.get(
  "/",
  authJwt,
  tryCatch(controller.getAll)
);

// List feature addons with company applied status
router.get(
  "/features/status",
  authJwt,
  tryCatch(controller.listFeatureWithCompanies)
);

// Get a specific add-on by ID
router.get(
  "/:id",
  authJwt,
  tryCatch(controller.getById)
);

// Create a new add-on (admin only)
router.post(
  "/",
  authJwt,
  tryCatch(controller.create)
);

// Update an add-on (admin only)
router.put(
  "/:id",
  authJwt,
  tryCatch(controller.update)
);

// Delete an add-on (admin only)
router.delete(
  "/:id",
  authJwt,
  tryCatch(controller.delete)
);

// Buy add-on for a company
router.post(
  "/:companyId/buy",
  authJwt,
  tryCatch(controller.buyAddon)
);

module.exports = router;
