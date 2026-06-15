// src/saas/controllers/addon.controller.js
const AddonService = require('../services/addon.service');
const { sendSuccess, sendError } = require('../../utils/response');

/**
 * Get all active add-ons with pagination
 */
exports.getAll = async (req, res) => {
  const data = await AddonService.getAll(req.query);
  return sendSuccess(res, data, "Add-ons fetched successfully");
};

/**
 * Get a specific add-on by ID
 */
exports.getById = async (req, res) => {
  const addon = await AddonService.getAddonById(req.params.id);
  return sendSuccess(res, addon.addon, "Add-on fetched successfully");
};

/**
 * Create a new add-on (admin only)
 */
exports.create = async (req, res) => {
  const result = await AddonService.createAddon(req.body, req.user?._id);
  return sendSuccess(res, result.addon, "Add-on created successfully");
};

/**
 * Update an add-on (admin only)
 */
exports.update = async (req, res) => {
  const result = await AddonService.updateAddon(req.params.id, req.body, req.user?._id);
  return sendSuccess(res, result.addon, "Add-on updated successfully");
};

/**
 * Delete an add-on (admin only)
 */
exports.delete = async (req, res) => {
  await AddonService.deleteAddon(req.params.id);
  return sendSuccess(res, null, "Add-on deleted successfully");
};

/**
 * Buy add-on for a company
 */
exports.buyAddon = async (req, res) => {
  const { companyId } = req.params;
  const { addonCode, units = 1, method } = req.body;
  const result = await AddonService.buyAddon({ 
    companyId, 
    addonCode, 
    units, 
    method, 
    createdBy: req.user?._id 
  });
  return sendSuccess(res, result, "Add-on purchased successfully");
};

// List feature-type addons and show which companies have them applied
exports.listFeatureWithCompanies = async (req, res) => {
  const data = await AddonService.getFeatureAddonsWithCompanies();
  return sendSuccess(res, data, 'Feature-addons with company status fetched');
};


