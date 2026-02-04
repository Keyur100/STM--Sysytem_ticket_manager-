// src/saas/controllers/addon.controller.js
const AddonService = require('../services/addon.service');
const { sendSuccess, sendError } = require('../../utils/response');

/**
 * Get all active add-ons
 */
exports.getAll = async (req, res) => {
  try {
    const result = await AddonService.getAllAddons();
    return sendSuccess(res, result.addons, "Add-ons fetched successfully");
  } catch (err) {
    console.error("Error fetching addons:", err);
    return sendError(res, "Failed to fetch add-ons", 500);
  }
};

/**
 * Get a specific add-on by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AddonService.getAddonById(id);
    return sendSuccess(res, result.addon, "Add-on fetched successfully");
  } catch (err) {
    console.error("Error fetching addon:", err);
    return sendError(res, err.message || "Add-on not found", 404);
  }
};

/**
 * Create a new add-on (admin only)
 */
exports.create = async (req, res) => {
  try {
    const result = await AddonService.createAddon(req.body, req.user?._id);
    return sendSuccess(res, result.addon, "Add-on created successfully");
  } catch (err) {
    console.error("Error creating addon:", err);
    return sendError(res, err.message || "Failed to create add-on", 400);
  }
};

/**
 * Update an add-on (admin only)
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AddonService.updateAddon(id, req.body, req.user?._id);
    return sendSuccess(res, result.addon, "Add-on updated successfully");
  } catch (err) {
    console.error("Error updating addon:", err);
    return sendError(res, err.message || "Failed to update add-on", 400);
  }
};

/**
 * Delete an add-on (admin only)
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AddonService.deleteAddon(id);
    return sendSuccess(res, null, "Add-on deleted successfully");
  } catch (err) {
    console.error("Error deleting addon:", err);
    return sendError(res, err.message || "Failed to delete add-on", 400);
  }
};

/**
 * Buy add-on for a company
 */
exports.buyAddon = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Error buying addon:", err);
    return sendError(res, err.message || "Failed to buy add-on", 400);
  }
};


