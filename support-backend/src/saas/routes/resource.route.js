// resource.route.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/resource.controller.js");

router.get("/", (req, res) => controller.getAll?.(req, res));
router.post("/", (req, res) => controller.create?.(req, res));

module.exports = router;
