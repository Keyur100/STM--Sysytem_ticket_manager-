// src/saas/controllers/company.controller.js
const CompanyService = require("../services/company.service");
const { sendSuccess, sendError } = require("../../utils/response");
const { enqueueJob } = require("../libs/jobQueue");
const { COMPANY_ERRORS } = require("../constants/saas.constant");

const signup = async (req, res) => {
  try {
    const payload = req.body;
    const createdBy = req.user?._id;
    const company = await CompanyService.signupCompany(payload, createdBy);

    // Audit event handled inside service
    return sendSuccess(res, company, "Company created successfully");
  } catch (err) {
    console.error("Error in signup:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

const get = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const company = await CompanyService.getCompanyById(companyId);

    if (!company) {
      return sendError(res, 404, COMPANY_ERRORS.COMPANY_NOT_FOUND);
    }

    return sendSuccess(res, company, "Company fetched successfully");
  } catch (err) {
    console.error("Error in get company:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const updatedBy = req.user?._id;
    const payload = req.body;

    const company = await CompanyService.updateCompany(companyId, payload, updatedBy);

    if (!company) {
      return sendError(res, 404, COMPANY_ERRORS.COMPANY_NOT_FOUND);
    }

    // Background audit job
    await enqueueJob({
      type: "audit.log_event",
      payload: { action: "update", entityType: "Company", entityId: companyId, updatedBy },
      priority: 5,
    });

    return sendSuccess(res, company, "Company updated successfully");
  } catch (err) {
    console.error("Error in update company:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

const list = async (req, res) => {
  try {
    const { page, limit, search, sortBy, sortOrder } = req.query;

    const result = await CompanyService.listCompanies({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    return sendSuccess(res, result, "Company list fetched successfully");
  } catch (err) {
    console.error("Error in list companies:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

const suspend = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { reason } = req.body;
    const updatedBy = req.user?._id;

    const company = await CompanyService.suspendCompany(companyId, reason);

    if (!company) {
      return sendError(res, 404, COMPANY_ERRORS.COMPANY_NOT_FOUND);
    }

    await enqueueJob({
      type: "audit.log_event",
      payload: { action: "suspend", entityType: "Company", entityId: companyId, reason, updatedBy },
      priority: 8,
    });

    return sendSuccess(res, company, "Company suspended successfully");
  } catch (err) {
    console.error("Error in suspend company:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  signup,
  get,
  update,
  list,
  suspend,
};
