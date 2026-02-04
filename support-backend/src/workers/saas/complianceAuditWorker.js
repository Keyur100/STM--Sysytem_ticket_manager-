/**
 * Compliance & Audit Worker
 * Monitors subscription compliance, tracks usage violations, and maintains audit logs
 * Handles SLA checks and compliance alerts
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const Subscription = require('../../saas/models/subscription.model');
const Company = require('../../saas/models/company.model');
const UsageRecord = require('../../saas/models/usageRecord.model');
const AuditTrail = require('../../saas/models/auditTrail.model');
const logger = require('../../libs/logger');
const { enqueueJob } = require('../../libs/jobQueue');

async function complianceAuditProcessor(job) {
  try {
    const { companyId, auditType = 'GENERAL' } = job.payload || {};

    if (!companyId) {
      throw new Error('Missing companyId in payload');
    }

    // Fetch company
    const company = await Company.findById(companyId);
    if (!company) {
      logger.warn({ companyId }, 'Company not found');
      return { processed: false, reason: 'Company not found' };
    }

    // Get active subscription if exists
    const subscription = company.activeSubscriptionId 
      ? await Subscription.findById(company.activeSubscriptionId)
      : null;

    const audit = {
      companyId,
      subscriptionId: subscription?._id || null,
      auditType,
      timestamp: new Date(),
      findings: [],
      status: 'COMPLIANT',
    };

    // Check 1: Subscription status compliance
    if (!subscription) {
      audit.findings.push({
        category: 'SUBSCRIPTION_STATUS',
        severity: 'MEDIUM',
        message: 'No active subscription found',
        timestamp: new Date(),
      });
    } else if (subscription.status !== 'ACTIVE' && subscription.status !== 'GRACE_PERIOD') {
      audit.findings.push({
        category: 'SUBSCRIPTION_STATUS',
        severity: 'HIGH',
        message: `Subscription status is ${subscription.status}`,
        timestamp: new Date(),
      });
      audit.status = 'NON_COMPLIANT';
    }

    // Check 2: Company status compliance
    if (company.status === 'suspended') {
      audit.findings.push({
        category: 'COMPANY_STATUS',
        severity: 'HIGH',
        message: 'Company is suspended',
        timestamp: new Date(),
      });
      audit.status = 'NON_COMPLIANT';
    }

    // Check 3: Usage violations
    if (subscription) {
      const startAt = new Date(subscription.startAt * 1000);
      const usageData = await UsageRecord.aggregate([
        {
          $match: {
            company: company._id,
            recordedAt: { $gte: startAt },
          },
        },
        {
          $group: {
            _id: '$metric',
            total: { $sum: '$quantity' },
          },
        },
      ]);

      if (usageData.length > 0) {
        for (const usage of usageData) {
          if (usage.total > 0) {
            audit.findings.push({
              category: 'USAGE_RECORDED',
              severity: 'INFO',
              metric: usage._id,
              quantity: usage.total,
              timestamp: new Date(),
            });
          }
        }
      }
    }

    // Save audit trail
    const auditRecord = await AuditTrail.create(audit);

    // If non-compliant, enqueue alert
    if (audit.status === 'NON_COMPLIANT') {
      await enqueueJob({
        type: 'notification.compliance_alert',
        payload: {
          companyId,
          auditId: auditRecord._id,
          findings: audit.findings,
          status: audit.status,
        },
        priority: 9,
      });

      logger.warn(
        { companyId, findingCount: audit.findings.length },
        'Compliance issues found'
      );
    }

    logger.info(
      { companyId, auditId: auditRecord._id, status: audit.status },
      'Compliance audit completed'
    );

    return {
      processed: true,
      auditId: auditRecord._id,
      status: audit.status,
      findingCount: audit.findings.length,
    };
  } catch (err) {
    logger.error({ err: err.message, jobId: job._id }, 'Compliance audit failed');
    throw err;
  }
}

// Main worker entry point
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Compliance & Audit Worker started');

      baseWorkerLoop({
        workerId: 'complianceAuditWorker-' + process.pid,
        jobTypes: ['subscription.compliance_audit', 'subscription.sla_check'],
        processFunc: complianceAuditProcessor,
        pollInterval: 15000, // Poll every 15 seconds
      });
    } catch (err) {
      logger.error(err, 'Failed to start Compliance & Audit Worker');
      process.exit(1);
    }
  })();
}

module.exports = { complianceAuditProcessor };
