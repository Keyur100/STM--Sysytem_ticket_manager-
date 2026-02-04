// src/saas/utils/workerQueue.util.js
/**
 * Utility functions to enqueue subscription-related worker jobs
 * Use these functions from your controllers/services to trigger worker tasks
 */

const { enqueueJob } = require('../../libs/jobQueue');
const logger = require('../../libs/logger');

class WorkerQueueUtil {
  /**
   * Schedule subscription expiry check
   * @param {String} subscriptionId - MongoDB ObjectId of subscription
   * @param {String} companyId - MongoDB ObjectId of company
   * @param {Number} priority - Job priority (1-10, 10 is highest)
   */
  static async enqueueSubscriptionExpiryCheck(subscriptionId, companyId, priority = 8) {
    try {
      await enqueueJob({
        type: 'subscription.expiry_check',
        payload: { subscriptionId, companyId },
        priority,
      });
      logger.info(
        { subscriptionId, companyId },
        'Subscription expiry check enqueued'
      );
    } catch (err) {
      logger.error(err, 'Failed to enqueue subscription expiry check');
      throw err;
    }
  }

  /**
   * Schedule grace period check
   * @param {String} subscriptionId - MongoDB ObjectId of subscription
   * @param {String} companyId - MongoDB ObjectId of company
   */
  static async enqueueGracePeriodCheck(subscriptionId, companyId) {
    try {
      await enqueueJob({
        type: 'subscription.grace_period_check',
        payload: { subscriptionId, companyId },
        priority: 9,
      });
      logger.info({ subscriptionId, companyId }, 'Grace period check enqueued');
    } catch (err) {
      logger.error(err, 'Failed to enqueue grace period check');
      throw err;
    }
  }

  /**
   * Schedule usage check for a company
   * @param {String} companyId - MongoDB ObjectId of company
   * @param {String} metric - Optional metric type (USER, GB, TICKET, API_CALL)
   */
  static async enqueueUsageCheck(companyId, metric = null) {
    try {
      const payload = { companyId };
      if (metric) payload.metric = metric;

      await enqueueJob({
        type: 'subscription.usage_check',
        payload,
        priority: 8,
      });
      logger.info(
        { companyId, metric },
        'Usage check enqueued'
      );
    } catch (err) {
      logger.error(err, 'Failed to enqueue usage check');
      throw err;
    }
  }

  /**
   * Schedule expiry reminder for subscription
   * @param {String} subscriptionId - MongoDB ObjectId of subscription
   * @param {String} companyId - MongoDB ObjectId of company
   * @param {Number} daysUntilExpiry - Days until expiry
   */
  static async enqueuePlanExpiryReminder(subscriptionId, companyId, daysUntilExpiry) {
    try {
      await enqueueJob({
        type: 'subscription.expiry_reminder',
        payload: { subscriptionId, companyId, daysUntilExpiry },
        priority: 8,
      });
      logger.info(
        { subscriptionId, companyId, daysUntilExpiry },
        'Plan expiry reminder enqueued'
      );
    } catch (err) {
      logger.error(err, 'Failed to enqueue plan expiry reminder');
      throw err;
    }
  }

  /**
   * Schedule addon expiry check
   * @param {String} companyId - MongoDB ObjectId of company
   */
  static async enqueueAddonExpiryCheck(companyId) {
    try {
      await enqueueJob({
        type: 'subscription.addon_expiry_check',
        payload: { companyId },
        priority: 7,
      });
      logger.info({ companyId }, 'Addon expiry check enqueued');
    } catch (err) {
      logger.error(err, 'Failed to enqueue addon expiry check');
      throw err;
    }
  }

  /**
   * Schedule subscription renewal check
   * @param {String} subscriptionId - MongoDB ObjectId of subscription
   * @param {String} companyId - MongoDB ObjectId of company
   */
  static async enqueueSubscriptionRenewalCheck(subscriptionId, companyId) {
    try {
      await enqueueJob({
        type: 'subscription.renewal_check',
        payload: { subscriptionId, companyId },
        priority: 9,
      });
      logger.info(
        { subscriptionId, companyId },
        'Subscription renewal check enqueued'
      );
    } catch (err) {
      logger.error(err, 'Failed to enqueue subscription renewal check');
      throw err;
    }
  }

  /**
   * Schedule compliance audit
   * @param {String} companyId - MongoDB ObjectId of company
   * @param {String} auditType - Type of audit (GENERAL, SLA_CHECK, PAYMENT_CHECK)
   */
  static async enqueueComplianceAudit(companyId, auditType = 'GENERAL') {
    try {
      await enqueueJob({
        type: 'subscription.compliance_audit',
        payload: { companyId, auditType },
        priority: 8,
      });
      logger.info({ companyId, auditType }, 'Compliance audit enqueued');
    } catch (err) {
      logger.error(err, 'Failed to enqueue compliance audit');
      throw err;
    }
  }

  /**
   * Schedule SLA check
   * @param {String} companyId - MongoDB ObjectId of company
   */
  static async enqueueSLACheck(companyId) {
    try {
      await enqueueJob({
        type: 'subscription.sla_check',
        payload: { companyId, auditType: 'SLA_CHECK' },
        priority: 7,
      });
      logger.info({ companyId }, 'SLA check enqueued');
    } catch (err) {
      logger.error(err, 'Failed to enqueue SLA check');
      throw err;
    }
  }

  /**
   * Schedule bulk expiry checks for all subscriptions
   * Used for daily batch processing
   */
  static async enqueueBulkExpiryChecks(subscriptions) {
    try {
      const jobs = subscriptions.map(sub => ({
        type: 'subscription.expiry_check',
        payload: { 
          subscriptionId: sub._id,
          companyId: sub.companyId
        },
        priority: 8,
      }));

      for (const job of jobs) {
        await enqueueJob(job);
      }

      logger.info({ count: jobs.length }, 'Bulk expiry checks enqueued');
    } catch (err) {
      logger.error(err, 'Failed to enqueue bulk expiry checks');
      throw err;
    }
  }

  /**
   * Schedule bulk usage checks
   * Used for periodic monitoring
   */
  static async enqueueBulkUsageChecks(companies) {
    try {
      const jobs = companies.map(company => ({
        type: 'subscription.usage_check',
        payload: { companyId: company._id },
        priority: 8,
      }));

      for (const job of jobs) {
        await enqueueJob(job);
      }

      logger.info({ count: jobs.length }, 'Bulk usage checks enqueued');
    } catch (err) {
      logger.error(err, 'Failed to enqueue bulk usage checks');
      throw err;
    }
  }
}

module.exports = WorkerQueueUtil;
