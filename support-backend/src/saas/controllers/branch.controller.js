const BranchService = require('../services/branch.service');
const { sendSuccess, sendError } = require('../../utils/response');

const createBranch = async (req, res) => {
  try {
    const payload = req.body;
    const createdBy = req.user?._id;
    if (!payload.companyId || !payload.name) return sendError(res, 400, 'companyId and name required');

    const branch = await BranchService.createBranch(payload, createdBy);
    return sendSuccess(res, branch, 'Branch created');
  } catch (err) {
    console.error('Error creating branch', err);
    return sendError(res, 500, err.message || 'Failed to create branch');
  }
};

const listBranches = async (req, res) => {
  try {
    const { companyId, page = 1, limit = 50 } = req.query;
    if (!companyId) return sendError(res, 400, 'companyId required');
    const result = await BranchService.listBranchesByCompany(companyId, { page: Number(page), limit: Number(limit) });
    return sendSuccess(res, result, 'Branches fetched');
  } catch (err) {
    console.error('Error listing branches', err);
    return sendError(res, 500, err.message || 'Failed to list branches');
  }
};

const getBranch = async (req, res) => {
  try {
    const id = req.params.id;
    const branch = await BranchService.getBranchById(id);
    if (!branch) return sendError(res, 404, 'Branch not found');
    return sendSuccess(res, branch, 'Branch fetched');
  } catch (err) {
    console.error('Error getting branch', err);
    return sendError(res, 500, err.message || 'Failed to fetch branch');
  }
};

const updateBranch = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    const updated = await BranchService.updateBranch(id, payload);
    return sendSuccess(res, updated, 'Branch updated');
  } catch (err) {
    console.error('Error updating branch', err);
    return sendError(res, 500, err.message || 'Failed to update branch');
  }
};

const deleteBranch = async (req, res) => {
  try {
    const id = req.params.id;
    await BranchService.deleteBranch(id);
    return sendSuccess(res, null, 'Branch deleted');
  } catch (err) {
    console.error('Error deleting branch', err);
    return sendError(res, 500, err.message || 'Failed to delete branch');
  }
};

module.exports = {
  createBranch,
  listBranches,
  getBranch,
  updateBranch,
  deleteBranch,
};
