/**
 * Subscription Renewal Worker
 * Handles automatic renewal for subscriptions with autoRenew enabled
 * Triggers renewal requests or suspends accounts if renewal fails
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const Subscription = require('../../saas/models/subscription.model');
const Company = require('../../saas/models/company.model');
const logger = require('../../libs/logger');
const { enqueueJob } = require('../../libs/jobQueue');
const { SubscriptionStatus } = require('../../saas/constants/subscription.constant');

// Days before expiry to attempt renewal
const RENEWAL_TRIGGER_DAYS = 7;

async function subscriptionRenewalProcessor(job) {
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

    // Check if auto renewal is enabled
    if (!subscription.autoRenew) {
      logger.info({ subscriptionId }, 'Auto renewal not enabled');
      return { processed: false, reason: 'Auto renewal disabled' };
    }

    // Only process active subscriptions
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      logger.info(
        { subscriptionId, status: subscription.status },
        'Subscription not active for renewal'
      );
      return { processed: false, reason: 'Subscription not active' };
    }

    const now = new Date();
    const endAt = new Date(subscription.endAt * 1000); // Convert timestamp to date
    const daysUntilExpiry = Math.ceil((endAt - now) / (1000 * 60 * 60 * 24));

    // Check if it's within the renewal trigger window
    if (daysUntilExpiry > RENEWAL_TRIGGER_DAYS) {
      return {
        processed: false,
        daysUntilExpiry,
        reason: 'Not yet time to renew',
      };
    }

    // Fetch company to check payment method
    const company = await Company.findById(companyId);
    if (!company) {
      logger.warn({ companyId }, 'Company not found');
      return { processed: false, reason: 'Company not found' };
    }

    // Enqueue renewal request
    await enqueueJob({
      type: 'subscription.renewal_request',
      payload: {
        subscriptionId,
        companyId,
        daysUntilExpiry,
        autoRenewal: true,
      },
      priority: 9,
    });

    logger.info(
      { subscriptionId, companyId, daysUntilExpiry },
      'Subscription renewal request queued'
    );

    return {
      processed: true,
      daysUntilExpiry,
      renewalRequested: true,
    };
  } catch (err) {
    logger.error({ err: err.message, jobId: job._id }, 'Subscription renewal check failed');
    throw err;
  }
}

// Main worker entry point
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Subscription Renewal Worker started');

      baseWorkerLoop({
        workerId: 'subscriptionRenewalWorker-' + process.pid,
        jobTypes: ['subscription.renewal_check'],
        processFunc: subscriptionRenewalProcessor,
        pollInterval: 8000, // Poll every 8 seconds
      });
    } catch (err) {
      logger.error(err, 'Failed to start Subscription Renewal Worker');
      process.exit(1);
    }
  })();
}

module.exports = { subscriptionRenewalProcessor };
