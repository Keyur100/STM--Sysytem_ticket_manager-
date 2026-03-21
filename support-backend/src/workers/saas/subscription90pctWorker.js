/**
 * Subscription 90% Usage / Time Elapsed Reminder Worker
 * Scans active subscriptions and sends a notification when subscription lifetime
 * has reached >= 90% of its duration. Uses subscription.notifications.notified90pct to avoid duplicates.
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const Subscription = require('../../saas/models/subscription.model');
const Company = require('../../saas/models/company.model');
const logger = require('../../libs/logger');
const { enqueueJob } = require('../../libs/jobQueue');

async function subscription90pctProcessor(job) {
  try {
    // Find active subscriptions that are not already notified
    const nowTs = Math.floor(Date.now() / 1000);

    const subs = await Subscription.find({ status: 'ACTIVE' }).lean();
    for (const s of subs) {
      if (!s.startAt || !s.endAt) continue;
      const duration = s.endAt - s.startAt;
      if (duration <= 0) continue;
      const elapsed = nowTs - s.startAt;
      const pct = elapsed / duration;
      if (pct >= 0.9) {
        const already = s.notifications && s.notifications.notified90pct;
        if (already) continue;

        // Enqueue notification job
        const company = await Company.findById(s.companyId).lean();
        await enqueueJob({
          type: 'notification.subscription_90pct',
          payload: {
            subscriptionId: s._id,
            companyId: s.companyId,
            companyName: company?.name,
            companyEmail: company?.contact?.email,
            pct: Math.round(pct * 100),
            endAt: new Date(s.endAt * 1000),
          },
          priority: 8,
        });

        // mark subscription as notified to avoid duplicates
        try {
          await Subscription.updateOne({ _id: s._id }, { $set: { 'notifications.notified90pct': true } });
        } catch (e) {
          logger.error({ err: e.message, subscriptionId: s._id }, 'Failed to mark subscription 90pct notified');
        }

        logger.info({ subscriptionId: s._id, pct }, 'Subscription reached 90% life and reminder queued');
      }
    }

    return { processed: true };
  } catch (err) {
    logger.error({ err: err.message }, 'subscription90pctProcessor failed');
    throw err;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Subscription 90% Worker started');

      baseWorkerLoop({
        workerId: 'subscription90pctWorker-' + process.pid,
        jobTypes: ['subscription.90pct_check'],
        processFunc: subscription90pctProcessor,
        pollInterval: 10000,
      });
    } catch (err) {
      logger.error(err, 'Failed to start subscription90pctWorker');
      process.exit(1);
    }
  })();
}

module.exports = { subscription90pctProcessor };