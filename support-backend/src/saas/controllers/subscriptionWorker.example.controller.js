// src/saas/controllers/subscriptionWorker.example.controller.js
/**
 * Example Controller for Manually Triggering Worker Tasks
 * Shows how to integrate worker queue utilities with API endpoints
 */

const WorkerQueueUtil = require('../utils/workerQueue.util');
const Subscription = require('../models/subscription.model');
const Company = require('../models/company.model');
const logger = require('../../libs/logger');

class SubscriptionWorkerController {
  /**
   * Manually trigger subscription expiry check
   * POST /api/saas/workers/subscription/expiry-check
   */
  static async triggerExpiryCheck(req, res) {
    try {
      const { subscriptionId, companyId } = req.body;

      if (!subscriptionId || !companyId) {
        return res.status(400).json({
          error: 'Missing subscriptionId or companyId',
        });
      }

      // Verify subscription exists
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Enqueue the job
      await WorkerQueueUtil.enqueueSubscriptionExpiryCheck(
        subscriptionId,
        companyId,
        req.body.priority || 8
      );

      return res.json({
        success: true,
        message: 'Subscription expiry check queued',
        jobType: 'subscription.expiry_check',
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger expiry check');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Manually trigger grace period check
   * POST /api/saas/workers/subscription/grace-period-check
   */
  static async triggerGracePeriodCheck(req, res) {
    try {
      const { subscriptionId, companyId } = req.body;

      if (!subscriptionId || !companyId) {
        return res.status(400).json({
          error: 'Missing subscriptionId or companyId',
        });
      }

      await WorkerQueueUtil.enqueueGracePeriodCheck(subscriptionId, companyId);

      return res.json({
        success: true,
        message: 'Grace period check queued',
        jobType: 'subscription.grace_period_check',
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger grace period check');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Manually trigger usage check
   * POST /api/saas/workers/subscription/usage-check
   */
  static async triggerUsageCheck(req, res) {
    try {
      const { companyId, metric } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: 'Missing companyId' });
      }

      await WorkerQueueUtil.enqueueUsageCheck(companyId, metric);

      return res.json({
        success: true,
        message: 'Usage check queued',
        jobType: 'subscription.usage_check',
        metric: metric || 'All metrics',
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger usage check');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Manually trigger expiry reminder
   * POST /api/saas/workers/subscription/expiry-reminder
   */
  static async triggerExpiryReminder(req, res) {
    try {
      const { subscriptionId, companyId, daysUntilExpiry } = req.body;

      if (!subscriptionId || !companyId || daysUntilExpiry === undefined) {
        return res.status(400).json({
          error: 'Missing subscriptionId, companyId, or daysUntilExpiry',
        });
      }

      await WorkerQueueUtil.enqueuePlanExpiryReminder(
        subscriptionId,
        companyId,
        daysUntilExpiry
      );

      return res.json({
        success: true,
        message: 'Expiry reminder queued',
        jobType: 'subscription.expiry_reminder',
        daysUntilExpiry,
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger expiry reminder');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Manually trigger addon expiry check
   * POST /api/saas/workers/subscription/addon-check
   */
  static async triggerAddonExpiryCheck(req, res) {
    try {
      const { companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: 'Missing companyId' });
      }

      await WorkerQueueUtil.enqueueAddonExpiryCheck(companyId);

      return res.json({
        success: true,
        message: 'Addon expiry check queued',
        jobType: 'subscription.addon_expiry_check',
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger addon expiry check');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Manually trigger renewal check
   * POST /api/saas/workers/subscription/renewal-check
   */
  static async triggerRenewalCheck(req, res) {
    try {
      const { subscriptionId, companyId } = req.body;

      if (!subscriptionId || !companyId) {
        return res.status(400).json({
          error: 'Missing subscriptionId or companyId',
        });
      }

      await WorkerQueueUtil.enqueueSubscriptionRenewalCheck(
        subscriptionId,
        companyId
      );

      return res.json({
        success: true,
        message: 'Renewal check queued',
        jobType: 'subscription.renewal_check',
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger renewal check');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Manually trigger compliance audit
   * POST /api/saas/workers/subscription/compliance-audit
   */
  static async triggerComplianceAudit(req, res) {
    try {
      const { companyId, auditType = 'GENERAL' } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: 'Missing companyId' });
      }

      await WorkerQueueUtil.enqueueComplianceAudit(companyId, auditType);

      return res.json({
        success: true,
        message: 'Compliance audit queued',
        jobType: 'subscription.compliance_audit',
        auditType,
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger compliance audit');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Manually trigger SLA check
   * POST /api/saas/workers/subscription/sla-check
   */
  static async triggerSLACheck(req, res) {
    try {
      const { companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: 'Missing companyId' });
      }

      await WorkerQueueUtil.enqueueSLACheck(companyId);

      return res.json({
        success: true,
        message: 'SLA check queued',
        jobType: 'subscription.sla_check',
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger SLA check');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Trigger all checks for a company (comprehensive)
   * POST /api/saas/workers/subscription/comprehensive-check
   */
  static async triggerComprehensiveCheck(req, res) {
    try {
      const { companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: 'Missing companyId' });
      }

      const company = await Company.findById(companyId).populate('subscription');

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      if (!company.subscription) {
        return res.status(404).json({ error: 'Company has no active subscription' });
      }

      // Queue all checks
      const jobs = [];

      jobs.push(
        WorkerQueueUtil.enqueueSubscriptionExpiryCheck(
          company.subscription._id,
          companyId
        )
      );
      jobs.push(WorkerQueueUtil.enqueueUsageCheck(companyId));
      jobs.push(WorkerQueueUtil.enqueueAddonExpiryCheck(companyId));
      jobs.push(
        WorkerQueueUtil.enqueueSubscriptionRenewalCheck(
          company.subscription._id,
          companyId
        )
      );
      jobs.push(WorkerQueueUtil.enqueueComplianceAudit(companyId));

      await Promise.all(jobs);

      return res.json({
        success: true,
        message: 'Comprehensive checks queued for company',
        jobsQueued: [
          'subscription.expiry_check',
          'subscription.usage_check',
          'subscription.addon_expiry_check',
          'subscription.renewal_check',
          'subscription.compliance_audit',
        ],
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger comprehensive check');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Queue daily batch expiry checks for all subscriptions
   * POST /api/saas/workers/batch/daily-expiry-checks
   * Can be called by a cron job or scheduled task
   */
  static async triggerDailyBatchChecks(req, res) {
    try {
      // Get all active subscriptions
      const subscriptions = await Subscription.find({
        status: 'ACTIVE',
      }).select('_id companyId');

      logger.info(
        { count: subscriptions.length },
        'Starting batch expiry checks'
      );

      await WorkerQueueUtil.enqueueBulkExpiryChecks(subscriptions);

      return res.json({
        success: true,
        message: 'Daily batch checks queued',
        subscriptionsQueued: subscriptions.length,
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger batch checks');
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Queue usage checks for all companies
   * POST /api/saas/workers/batch/usage-checks
   */
  static async triggerBatchUsageChecks(req, res) {
    try {
      const companies = await Company.find({ status: 'ACTIVE' }).select('_id');

      logger.info(
        { count: companies.length },
        'Starting batch usage checks'
      );

      await WorkerQueueUtil.enqueueBulkUsageChecks(companies);

      return res.json({
        success: true,
        message: 'Batch usage checks queued',
        companiesQueued: companies.length,
      });
    } catch (err) {
      logger.error(err, 'Failed to trigger batch usage checks');
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = SubscriptionWorkerController;

/**
 * INTEGRATION EXAMPLE
 *
 * Add these routes to your API router:
 *
 * const router = require('express').Router();
 * const SubscriptionWorkerController = require('./subscriptionWorker.example.controller');
 *
 * // Trigger individual checks
 * router.post('/workers/subscription/expiry-check', SubscriptionWorkerController.triggerExpiryCheck);
 * router.post('/workers/subscription/grace-period-check', SubscriptionWorkerController.triggerGracePeriodCheck);
 * router.post('/workers/subscription/usage-check', SubscriptionWorkerController.triggerUsageCheck);
 * router.post('/workers/subscription/expiry-reminder', SubscriptionWorkerController.triggerExpiryReminder);
 * router.post('/workers/subscription/addon-check', SubscriptionWorkerController.triggerAddonExpiryCheck);
 * router.post('/workers/subscription/renewal-check', SubscriptionWorkerController.triggerRenewalCheck);
 * router.post('/workers/subscription/compliance-audit', SubscriptionWorkerController.triggerComplianceAudit);
 * router.post('/workers/subscription/sla-check', SubscriptionWorkerController.triggerSLACheck);
 * router.post('/workers/subscription/comprehensive-check', SubscriptionWorkerController.triggerComprehensiveCheck);
 *
 * // Trigger batch checks
 * router.post('/workers/batch/daily-expiry-checks', SubscriptionWorkerController.triggerDailyBatchChecks);
 * router.post('/workers/batch/usage-checks', SubscriptionWorkerController.triggerBatchUsageChecks);
 */
