// usage.service.js
// src/saas/services/usage.service.js
const UsageRecord = require('../models/usageRecord.model');
const Company = require('../models/company.model');
const { enqueueJob } = require('../libs/jobQueue');
const { env } = require('../constants/saas.constant');

const quotaMap = {
  employees: { quotaField: 'max_employees', usageField: 'employees' },
  customers: { quotaField: 'max_customers', usageField: 'customers' },
  suppliers: { quotaField: 'max_suppliers', usageField: 'suppliers' },
  branches: { quotaField: 'max_branch', usageField: 'branches' },
  storage: { quotaField: 'storageMB', usageField: 'storageUsedMB' }
};

class UsageService {
  static async recordUsage({ companyId, metric, quantity = 1, createdBy = null, meta = {} }) {
    const rec = await UsageRecord.create({ company: companyId, metric, quantity, createdBy, meta });

    let resource = null;
    if (metric === 'USER') resource = 'employees';
    else if (metric === 'TICKET') resource = 'customers';
    else if (metric === 'SUPPLIER') resource = 'suppliers';
    else if (metric === 'BRANCH') resource = 'branches';
    else if (metric === 'GB') resource = 'storage';

    if (!resource) {
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'usage.record', recId: rec._id }, priority: 5 });
      return rec;
    }

    const mapping = quotaMap[resource];
    // Basic atomic update
    const company = await Company.findById(companyId);
    const quota = company[mapping.quotaField];
    if (quota != null && ((company.usage && company.usage[mapping.usageField]) || 0) + quantity > quota) {
      // Exceeded: enqueue enforcement + audit; return limit error
      await enqueueJob({ type: 'usage.quota_exceeded', payload: { companyId, metric, quantity }, priority: 10 });
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'usage.limit_exceeded', companyId, metric, quantity }, priority: 10 });
      return { error: 'LIMIT_EXCEEDED' };
    }

    // increment
    company.usage = company.usage || {};
    company.usage[mapping.usageField] = (company.usage[mapping.usageField] || 0) + quantity;
    await company.save();

    // if usage percent near thresholds, enqueue low-quota alert
    if (mapping.quotaField && company[mapping.quotaField]) {
      const percent = Math.round((company.usage[mapping.usageField] / company[mapping.quotaField]) * 100);
      if (percent >= env.LOW_QUOTA_ALERT_PERCENT) {
        await enqueueJob({ type: 'notification.low_quota', payload: { companyId, metric: resource, percent }, priority: 8 });
      }
    }

    await enqueueJob({ type: 'audit.log_event', payload: { action: 'usage.increment', recId: rec._id, companyId }, priority: 5 });
    return rec;
  }

  static async canCreate(companyId, resourceKey, increment = 1) {
    const company = await Company.findById(companyId).lean();
    if (!company) throw new Error('Company not found');
    const mapping = quotaMap[resourceKey];
    if (!mapping) return true;
    const quota = company[mapping.quotaField];
    if (quota == null) return true;
    const current = (company.usage && company.usage[mapping.usageField]) || 0;
    return current + increment <= quota;
  }
}

module.exports = UsageService;
