/**
 * Grace Period Expiry Worker
 * Monitors subscriptions in grace period and marks them as permanently expired
 * Grace period is typically 14 days after subscription expiry
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const Subscription = require('../../saas/models/subscription.model');
const Company = require('../../saas/models/company.model');
const logger = require('../../libs/logger');
const { SubscriptionStatus } = require('../../saas/constants/subscription.constant');
const { enqueueJob } = require('../../libs/jobQueue');

// Grace period in days (14 days after expiry)
const GRACE_PERIOD_DAYS = 14;

async function gracePeriodProcessor(job) {
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

    // Only process if subscription is in grace period or expired
    if (![SubscriptionStatus.EXPIRED, SubscriptionStatus.GRACE_PERIOD].includes(subscription.status)) {
      logger.info({ subscriptionId, currentStatus: subscription.status }, 'Subscription not eligible for grace period check');
      return { processed: false, reason: 'Not in expired or grace period status' };
    }

    const now = new Date();
    const endAt = new Date(subscription.endAt * 1000); // Convert timestamp to date
    const graceEndDate = new Date(endAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    // If within grace period
    if (now < graceEndDate && subscription.status !== SubscriptionStatus.GRACE_PERIOD) {
      subscription.status = SubscriptionStatus.GRACE_PERIOD;
      await subscription.save();

      // Update company status
      await Company.findByIdAndUpdate(
        companyId,
        {
          $set: {
            status: 'active', // Still active but in grace period
          },
        }
      );

      logger.info(
        { subscriptionId, companyId, graceEndDate },
        'Subscription entered grace period'
      );

      return { processed: true, graceEndDate, status: 'GRACE_PERIOD' };
    }

    // If grace period has expired
    if (now >= graceEndDate) {
      subscription.status = SubscriptionStatus.TERMINATED;
      await subscription.save();

      // Update company status
      await Company.findByIdAndUpdate(
        companyId,
        {
          $set: {
            status: 'suspended',
          },
        }
      );

      // Enqueue suspension notification
      await enqueueJob({
        type: 'subscription.account_suspended',
        payload: { subscriptionId, companyId, reason: 'grace_period_expired' },
        priority: 10,
      });

      logger.info(
        { subscriptionId, companyId, terminatedAt: now },
        'Subscription grace period expired - account suspended'
      );

      return { processed: true, terminatedAt: now, status: 'TERMINATED' };
    }

    // Calculate remaining grace period days
    const daysRemaining = Math.ceil((graceEndDate - now) / (1000 * 60 * 60 * 24));

    return { processed: true, daysRemaining, status: 'IN_GRACE_PERIOD' };
  } catch (err) {
    logger.error({ err: err.message, jobId: job._id }, 'Grace period check failed');
    throw err;
  }
}

// Main worker entry point
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Grace Period Worker started');

      baseWorkerLoop({
        workerId: 'gracePeriodWorker-' + process.pid,
        jobTypes: ['subscription.grace_period_check'],
        processFunc: gracePeriodProcessor,
        pollInterval: 10000, // Poll every 10 seconds
      });
    } catch (err) {
      logger.error(err, 'Failed to start Grace Period Worker');
      process.exit(1);
    }
  })();
}

module.exports = { gracePeriodProcessor };
