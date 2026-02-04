/**
 * Subscription Expiry Checker Worker
 * Monitors subscriptions and marks them as expired when endAt <= now
 * Runs daily to check for expired subscriptions
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const Subscription = require('../../saas/models/subscription.model');
const Company = require('../../saas/models/company.model');
const logger = require('../../libs/logger');
const { SubscriptionStatus } = require('../../saas/constants/subscription.constant');
const { enqueueJob } = require('../../libs/jobQueue');

async function subscriptionExpiryProcessor(job) {
  try {
    const { subscriptionId, companyId } = job.payload || {};

    if (!subscriptionId || !companyId) {
      throw new Error('Missing subscriptionId or companyId in payload');
    }

    // Fetch subscription
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      logger.warn({ subscriptionId }, 'Subscription not found');
      return { processed: false, reason: 'Subscription not found' };
    }

    // Check if already expired
    if (subscription.status === SubscriptionStatus.EXPIRED) {
      logger.info({ subscriptionId }, 'Subscription already marked as expired');
      return { processed: false, reason: 'Already expired' };
    }

    const now = new Date();
    const endAt = new Date(subscription.endAt * 1000); // Convert timestamp to date

    // If subscription has passed end date, mark as expired
    if (endAt <= now) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();

      // Update company status
      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          $set: {
            status: 'expired',
          },
        },
        { new: true }
      );

      // Enqueue grace period check
      await enqueueJob({
        type: 'subscription.grace_period_check',
        payload: { subscriptionId, companyId },
        priority: 9,
      });

      logger.info(
        { subscriptionId, companyId, expiredAt: endAt },
        'Subscription marked as expired'
      );

      return { processed: true, expiredAt: endAt, status: 'EXPIRED' };
    }

    // If approaching expiry (within 7 days), enqueue warning
    const daysUntilExpiry = Math.ceil((endAt - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      await enqueueJob({
        type: 'subscription.expiry_reminder',
        payload: { subscriptionId, companyId, daysUntilExpiry },
        priority: 8,
      });

      logger.info(
        { subscriptionId, companyId, daysUntilExpiry },
        'Subscription expiry reminder queued'
      );

      return { processed: true, daysUntilExpiry, status: 'APPROACHING_EXPIRY' };
    }

    return { processed: false, reason: 'Not yet expired' };
  } catch (err) {
    logger.error({ err: err.message, jobId: job._id }, 'Subscription expiry check failed');
    throw err;
  }
}

// Main worker entry point
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Subscription Expiry Worker started');

      baseWorkerLoop({
        workerId: 'subscriptionExpiryWorker-' + process.pid,
        jobTypes: ['subscription.expiry_check'],
        processFunc: subscriptionExpiryProcessor,
        pollInterval: 5000, // Poll every 5 seconds
      });
    } catch (err) {
      logger.error(err, 'Failed to start Subscription Expiry Worker');
      process.exit(1);
    }
  })();
}

module.exports = { subscriptionExpiryProcessor };
