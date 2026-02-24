// src/saas/controllers/company.controller.js
const CompanyService = require("../services/company.service");
const WalletService = require("../services/wallet.service");
const { sendSuccess, sendError } = require("../../utils/response");
const { enqueueJob } = require("../libs/jobQueue");
const { COMPANY_ERRORS } = require("../constants/saas.constant");

const signup = async (req, res) => {
  try {
    const payload = req.body;
    const createdBy = req.user?._id;
    const company = await CompanyService.signupOrUpdateCompany(payload, createdBy);

    // Audit event handled inside service
    return sendSuccess(res, company, "Company created successfully");
  } catch (err) {
    console.error("Error in signup:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

const draft = async (req, res) => {
  try {
    const payload = req.body;
    const createdBy = req.user?._id;
    const company = await CompanyService.createDraftCompany(payload, createdBy);

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

const getCompanyDetails = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    // Fetch company + populate subscription
    const company = await CompanyService.getCompanyById(companyId);
    if (!company) return sendError(res, 404, "Company not found");

    // Fetch wallet
    const wallet = await WalletService.getWallet(companyId);

    return sendSuccess(res, { company, wallet }, "Company details fetched successfully");
  } catch (err) {
    console.error("Error fetching company details:", err);
    return sendError(res, 500, err.message || "Internal server error");
  }
};

const getTransactions = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const limit = Number(req.query.limit) || 50;
    const page = Number(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Fetch transactions for company
    const transactions = await CompanyService.getCompanyTransactions(companyId, limit, skip);
    const totalCount = await CompanyService.getCompanyTransactionsCount(companyId);

    return sendSuccess(
      res,
      {
        transactions,
        pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) }
      },
      "Transactions fetched successfully"
    );
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return sendError(res, 500, err.message || "Internal server error");
  }
};

const recordCashPayment = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { orderId, cashReceiptNo } = req.body;
    const createdBy = req.user?._id;

    if (!orderId || !cashReceiptNo) {
      return sendError(res, 400, "orderId and cashReceiptNo are required");
    }

    const result = await CompanyService.recordCashPayment({
      companyId,
      orderId,
      cashReceiptNo,
      createdBy,
    });

    // Background audit job
    await enqueueJob({
      type: "audit.log_event",
      payload: {
        action: "record_cash_payment",
        entityType: "Order",
        entityId: orderId,
        companyId,
        createdBy,
      },
      priority: 5,
    });

    return sendSuccess(res, result, "Cash payment recorded successfully");
  } catch (err) {
    console.error("Error recording cash payment:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

const upgradeSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newPlanId, couponCode, useWallet } = req.body;
    const createdBy = req.user?._id;

    if (!subscriptionId || !newPlanId) {
      return sendError(res, 400, "subscriptionId and newPlanId are required");
    }

    const result = await CompanyService.upgradeSubscription({
      subscriptionId,
      newPlanId,
      couponCode,
      useWallet,
      createdBy,
    });

    return sendSuccess(res, result, "Subscription upgraded successfully");
  } catch (err) {
    console.error("Error upgrading subscription:", err);
    return sendError(res, 400, err.message || "Failed to upgrade subscription");
  }
};

const reactivateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { couponCode, useWallet } = req.body;
    const createdBy = req.user?._id;

    if (!subscriptionId) {
      return sendError(res, 400, "subscriptionId is required");
    }

    const result = await CompanyService.reactivateSubscription({
      subscriptionId,
      couponCode,
      useWallet,
      createdBy,
    });

    return sendSuccess(res, result, result.message);
  } catch (err) {
    console.error("Error reactivating subscription:", err);
    return sendError(res, 400, err.message || "Failed to reactivate subscription");
  }
};

const deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const deletedBy = req.user?._id;
    const result = await CompanyService.softDeleteCompany(companyId, deletedBy);
    return sendSuccess(res, result, "Company soft-deleted successfully");
  } catch (err) {
    console.error('Error deleting company:', err);
    return sendError(res, 500, err.message || 'Failed to delete company');
  }
};

const listDeletedCompanies = async (req, res) => {
  try {
    const result = await CompanyService.listDeletedCompanies(req.query || {});
    return sendSuccess(res, result, 'Deleted companies fetched');
  } catch (err) {
    console.error('Error listing deleted companies:', err);
    return sendError(res, 500, err.message || 'Failed to fetch deleted companies');
  }
};

const restoreCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const restored = await CompanyService.restoreCompany(companyId, req.user?._id);
    return sendSuccess(res, restored, 'Company restored');
  } catch (err) {
    console.error('Error restoring company:', err);
    return sendError(res, 500, err.message || 'Failed to restore company');
  }
};
const getPaymentHistory = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const result = await CompanyService.getCompanyPaymentHistory(companyId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    return sendSuccess(res, result, "Payment history fetched successfully");
  } catch (err) {
    console.error("Error fetching payment history:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

const getFullDetails = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const result = await CompanyService.getCompanyFullDetails(companyId);

    if (!result) {
      return sendError(res, 404, COMPANY_ERRORS.COMPANY_NOT_FOUND);
    }

    return sendSuccess(res, result, "Company full details fetched successfully");
  } catch (err) {
    console.error("Error fetching company full details:", err);
    return sendError(res, 500, err.message || COMPANY_ERRORS.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  signup,
  get,
  update,
  list,
  suspend,
  draft,
  getCompanyDetails,
  getTransactions,
  recordCashPayment,
  upgradeSubscription,
  reactivateSubscription,
  deleteCompany,
  listDeletedCompanies,
  restoreCompany,
  getPaymentHistory,
  getFullDetails,
};
