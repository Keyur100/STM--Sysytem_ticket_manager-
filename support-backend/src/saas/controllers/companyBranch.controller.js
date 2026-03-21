const { sendSecureRequest } = require('../services/sync.service');
const { sendSuccess, sendError } = require('../../utils/response');
const Company = require('../models/company.model');
const Branch = require('../models/branch.model');
const SyncLog = require('../models/syncLog.model');

// Update or create branch admin info and trigger 3 external APIs sequentially
const updateBranchAdmin = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { branchId, admin } = req.body; // admin: { name, email, phone }
    const userId = req.user && req.user._id;

    if (!companyId || !branchId || !admin) return sendError(res, 400, 'companyId, branchId and admin required');

    // upsert branch
    let branch = await Branch.findOne({ _id: branchId, companyId });
    if (!branch) {
      branch = await Branch.create({ _id: branchId, companyId, admins: [admin] });
    } else {
      // replace or append admin (simple logic: push if email not exists)
      branch.admins = branch.admins || [];
      const idx = branch.admins.findIndex(a => a.email === admin.email);
      if (idx === -1) branch.admins.push(admin);
      else branch.admins[idx] = { ...branch.admins[idx], ...admin };
      await branch.save();
    }

    // Persist to company document (lightweight map)
    const company = await Company.findById(companyId);
    if (!company) return sendError(res, 404, 'Company not found');

    company.selectedBranches = company.selectedBranches || {};
    company.selectedBranches[branchId] = { branchId, updatedBy: userId, updatedAt: Date.now() };
    await company.save();

    // Trigger three remote APIs using sendSecureRequest — example endpoints from env
    const urls = [process.env.REMOTE_API_1, process.env.REMOTE_API_2, process.env.REMOTE_API_3].filter(Boolean);
    const results = [];
    for (const u of urls) {
      try {
        const payload = { companyId, branchId, admin };
        const resp = await sendSecureRequest(payload, u);
        results.push({ url: u, status: 'success', data: resp.data || null });
        // Log success in SyncLog
        try {
          await SyncLog.create({ companyId, step: 'branch_admin', status: 'success', message: `Called ${u}`, remoteResponse: resp.data || null });
        } catch (e) { /* ignore logging errors */ }
      } catch (err) {
        results.push({ url: u, status: 'failed', error: err.message || String(err), remoteResponse: err.response?.data || null });
        try {
          await SyncLog.create({ companyId, step: 'branch_admin', status: 'failed', message: `Call to ${u} failed: ${err.message || String(err)}`, remoteResponse: err.response?.data || null });
        } catch (e) { /* ignore logging errors */ }
      }
    }

    return sendSuccess(res, { branchId: branch._id, results }, 'Branch admin updated and external calls attempted');
  } catch (err) {
    console.error('updateBranchAdmin error', err);
    return sendError(res, 500, err.message || 'Failed to update branch admin');
  }
};

module.exports = { updateBranchAdmin };