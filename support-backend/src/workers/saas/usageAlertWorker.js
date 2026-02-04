/**
 * Usage Alert Worker
 * Monitors plan usage and sends alerts when 90% usage threshold is reached
 * Supports multiple metrics: Users, GB Storage, Tickets, API Calls
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const UsageRecord = require('../../saas/models/usageRecord.model');
const Subscription = require('../../saas/models/subscription.model');
const Plan = require('../../saas/models/plan.model');
const Company = require('../../saas/models/company.model');
const logger = require('../../libs/logger');
const { enqueueJob } = require('../../libs/jobQueue');

// Usage threshold for alerts (90%)
const ALERT_THRESHOLD_PERCENT = 90;

async function usageAlertProcessor(job) {
  try {
    const { companyId, metric } = job.payload || {};

    if (!companyId) {
      throw new Error('Missing companyId in payload');
    }

    // Fetch company
    const company = await Company.findById(companyId);
    if (!company) {
      logger.warn({ companyId }, 'Company not found');
      return { processed: false, reason: 'Company not found' };
    }

    // Get active subscription
    if (!company.activeSubscriptionId) {
      logger.warn({ companyId }, 'No active subscription');
      return { processed: false, reason: 'No active subscription' };
    }

    const subscription = await Subscription.findById(company.activeSubscriptionId);
    if (!subscription) {
      logger.warn({ companyId, subscriptionId: company.activeSubscriptionId }, 'Subscription not found');
      return { processed: false, reason: 'Subscription not found' };
    }

    const plan = await Plan.findById(subscription.planId);

    if (!plan) {
      logger.warn({ companyId, planId: subscription.planId }, 'Plan not found');
      return { processed: false, reason: 'Plan not found' };
    }

    // Get plan limits from userPricing or planSnapshot
    const planLimits = plan.userPricing || subscription.planSnapshot?.userPricing || {};

    // Get all metrics to check
    const metricsToCheck = metric ? [metric] : ['USER', 'GB', 'TICKET', 'API_CALL'];

    const alerts = [];

    for (const m of metricsToCheck) {
      const limit = planLimits[m] || planLimits[m.toLowerCase()];

      if (!limit || limit === -1) {
        // -1 means unlimited
        continue;
      }

      // Get usage in current billing period
      const startAt = new Date(subscription.startAt * 1000); // Convert timestamp to date
      const currentUsage = await UsageRecord.aggregate([
        {
          $match: {
            company: company._id,
            metric: m,
            recordedAt: { $gte: startAt },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$quantity' },
          },
        },
      ]);

      const usage = currentUsage[0]?.total || 0;
      const usagePercent = Math.round((usage / limit) * 100);

      logger.info(
        { companyId, metric: m, usage, limit, usagePercent },
        'Usage check'
      );

      // Check if usage exceeds 90% threshold
      if (usagePercent >= ALERT_THRESHOLD_PERCENT) {
        alerts.push({
          metric: m,
          usage,
          limit,
          usagePercent,
          alertType: usagePercent >= 100 ? 'EXCEEDED' : 'APPROACHING',
        });

        // Enqueue notification job
        await enqueueJob({
          type: 'notification.usage_alert',
          payload: {
            companyId,
            subscriptionId: subscription._id,
            metric: m,
            usage,
            limit,
            usagePercent,
            alertType: usagePercent >= 100 ? 'EXCEEDED' : 'APPROACHING',
          },
          priority: 8,
        });

        logger.warn(
          { companyId, metric: m, usagePercent },
          'Usage alert generated'
        );
      }
    }

    return {
      processed: alerts.length > 0,
      alertCount: alerts.length,
      alerts,
    };
            limit,
            usagePercent,
            alertType: usagePercent >= 100 ? 'EXCEEDED' : 'APPROACHING',
          },
          priority: 8,
        });

        logger.warn(
          { companyId, metric: m, usagePercent },
          'Usage alert generated'
        );
      }
    }

    return {
      processed: alerts.length > 0,
      alertCount: alerts.length,
      alerts,
    };
  } catch (err) {
    logger.error({ err: err.message, jobId: job._id }, 'Usage alert check failed');
    throw err;
  }
}

// Main worker entry point
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Usage Alert Worker started');

      baseWorkerLoop({
        workerId: 'usageAlertWorker-' + process.pid,
        jobTypes: ['subscription.usage_check'],
        processFunc: usageAlertProcessor,
        pollInterval: 3000, // Poll every 3 seconds
      });
    } catch (err) {
      logger.error(err, 'Failed to start Usage Alert Worker');
      process.exit(1);
    }
  })();
}

module.exports = { usageAlertProcessor };
