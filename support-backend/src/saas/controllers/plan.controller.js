// src/saas/controllers/plan.controller.js
const PlanService = require('../services/plan.service');
const { sendSuccess, sendError } = require('../../utils/response');

/**
 * Create a new plan
 */
exports.createPlan = async (req, res) => {
  try {
    const userId = req.user?._id;
    const plan = await PlanService.createPlan(req.body, userId);
    return sendSuccess(res, plan, 'Plan created successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

/**
 * Get all plans with optional filters
 */
exports.getAllPlans = async (req, res) => {
  try {
    const { isActive, planGroup, billingCycle, search, page = 1, limit = 20 } = req.query;

    const plans = await PlanService.getAllPlans({
      isActive: isActive !== undefined ? isActive === 'true' : true,
      planGroup,
      billingCycle,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return sendSuccess(res, plans, "Plans fetched successfully");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

/**
 * Get plan by code
 */
exports.getPlanByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const plan = await PlanService.getPlanByCode(code);
    if (!plan) return sendError(res, 404, 'Plan not found');
    return sendSuccess(res, plan, 'Plan fetched successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

/**
 * Update plan
 */
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const updatedPlan = await PlanService.updatePlan(id, req.body, userId);
    return sendSuccess(res, updatedPlan, 'Plan updated successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

/**
 * Delete plan
 */
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    await PlanService.deletePlan(id, userId);
    return sendSuccess(res, null, 'Plan deleted successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};
