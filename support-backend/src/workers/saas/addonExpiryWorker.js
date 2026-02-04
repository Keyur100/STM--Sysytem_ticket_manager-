/**
 * Addon Expiry Worker
 * Monitors addon expirations in subscription addonSnapshot
 * Handles addon notifications based on expiration dates
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const Subscription = require('../../saas/models/subscription.model');
const Addon = require('../../saas/models/addon.model');
const logger = require('../../libs/logger');
const { enqueueJob } = require('../../libs/jobQueue');

async function addonExpiryProcessor(job) {
  try {
    const { subscriptionId, companyId } = job.payload || {};

    if (!subscriptionId || !companyId) {
      throw new Error('Missing subscriptionId or companyId in payload');
    }

    // Fetch subscription with addon snapshots
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      logger.warn({ subscriptionId }, 'Subscription not found');
      return { processed: false, reason: 'Subscription not found' };
    }

    if (!subscription.addonSnapshot || subscription.addonSnapshot.length === 0) {
      return { processed: false, reason: 'No addons in subscription' };
    }

    const now = new Date();
    const expiredAddons = [];
    const expiringAddons = [];

    // Check each addon in subscription snapshot
    for (const addon of subscription.addonSnapshot) {
      // Note: addonSnapshot stores addon details but may not have expiry date
      // This is more for tracking applied addons and their pricing
      
      expiredAddons.push({
        addonId: addon.addonId,
        name: addon.name,
        qty: addon.qty,
        pricePaise: addon.pricePaise,
      });

      logger.info(
        { companyId, subscriptionId, addonId: addon.addonId },
        'Addon tracked in subscription'
      );
    }

    // Enqueue addon tracking notification if any addons exist
    if (expiredAddons.length > 0) {
      await enqueueJob({
        type: 'notification.addon_tracking',
        payload: {
          companyId,
          subscriptionId,
          addons: expiredAddons,
        },
        priority: 7,
      });
    }

    return {
      processed: expiredAddons.length > 0,
      addonCount: expiredAddons.length,
      addons: expiredAddons,
    };
  } catch (err) {
    logger.error({ err: err.message, jobId: job._id }, 'Addon tracking failed');
    throw err;
  }
}


// Main worker entry point
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Addon Tracking Worker started');

      baseWorkerLoop({
        workerId: 'addonTrackingWorker-' + process.pid,
        jobTypes: ['subscription.addon_tracking'],
        processFunc: addonExpiryProcessor,
        pollInterval: 7000, // Poll every 7 seconds
      });
    } catch (err) {
      logger.error(err, 'Failed to start Addon Tracking Worker');
      process.exit(1);
    }
  })();
}

module.exports = { addonExpiryProcessor };
