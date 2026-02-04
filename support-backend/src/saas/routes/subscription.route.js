// subscription.route.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/subscription.controller.js");
const authJwt = require("../../middlewares/authJwt");
const rbac = require("../../middlewares/rbac");
const tryCatch = require("../../middlewares/tryCatch");

router.get("/", (req, res) => controller.getAll?.(req, res));
router.post("/", (req, res) => controller.create?.(req, res));

// Get subscription by ID
router.get(
  "/:id",
  authJwt,
  rbac("saas.subscription_view"),
  tryCatch(controller.getById || ((req, res) => {
    res.status(501).json({ message: "Not implemented" });
  }))
);

// Get all subscriptions for a company
router.get(
  "/company/:companyId",
  authJwt,
  rbac("saas.subscription_view"),
  tryCatch(controller.getByCompanyId || ((req, res) => {
    res.status(501).json({ message: "Not implemented" });
  }))
);

module.exports = router;
