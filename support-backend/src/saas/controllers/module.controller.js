// src/saas/controllers/module.controller.js
const ModuleService = require('../services/module.service');
const { sendSuccess, sendError } = require('../../utils/response');

exports.create = async (req, res) => {
  try {
    const userId = req.user?._id;
    const module = await ModuleService.createModule(req.body, userId);
    return sendSuccess(res, module, 'Module created successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await ModuleService.getAllModules(req.query);
    return sendSuccess(res, data, 'Modules fetched successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const module = await ModuleService.getModuleById(req.params.id);
    return sendSuccess(res, module, 'Module fetched successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user?._id;
    const module = await ModuleService.updateModule(req.params.id, req.body, userId);
    return sendSuccess(res, module, 'Module updated successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    await ModuleService.deleteModule(req.params.id);
    return sendSuccess(res, null, 'Module deleted successfully');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};
