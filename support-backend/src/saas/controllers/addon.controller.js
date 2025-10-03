// src/saas/controllers/addon.controller.js
const AddonService = require('../services/addon.service');

exports.buyAddon = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { addonCode, units = 1, method } = req.body;
    const result = await AddonService.buyAddon({ companyId, addonCode, units, method, createdBy: req.user && req.user._id });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
