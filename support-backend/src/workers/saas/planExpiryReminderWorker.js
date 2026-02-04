/**
 * Plan Expiry Reminder Worker
 * Sends reminders when subscription is approaching expiry
 * Sends reminders at: 14 days, 7 days, 3 days, 1 day before expiry
 */

const baseWorkerLoop = require('../baseWorker');
const { connectMongoose } = require('../../models/mongoose');
const Subscription = require('../../saas/models/subscription.model');
const Company = require('../../saas/models/company.model');
const logger = require('../../libs/logger');
const { enqueueJob } = require('../../libs/jobQueue');

// Reminder intervals in days
const REMINDER_DAYS = [14, 7, 3, 1];

async function planExpiryReminderProcessor(job) {
  try {
    const { subscriptionId, companyId, daysUntilExpiry } = job.payload || {};

    if (!subscriptionId || !companyId) {
      throw new Error('Missing subscriptionId or companyId in payload');
    }

    // Fetch subscription
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      logger.warn({ subscriptionId }, 'Subscription not found');
      return { processed: false, reason: 'Subscription not found' };
    }

    const now = new Date();
    const endAt = new Date(subscription.endAt * 1000); // Convert timestamp to date
    const calculatedDaysUntilExpiry = Math.ceil((endAt - now) / (1000 * 60 * 60 * 24));

    // Check if this is a reminder day
    const isReminderDay = REMINDER_DAYS.includes(calculatedDaysUntilExpiry);

    if (isReminderDay) {
      // Fetch company to get contact info
      const company = await Company.findById(companyId);

      // Enqueue reminder notification
      await enqueueJob({
        type: 'notification.plan_expiry_reminder',
        payload: {
          companyId,
          subscriptionId,
          daysUntilExpiry: calculatedDaysUntilExpiry,
          expiryDate: endAt,
          companyName: company?.name,
          companyEmail: company?.contact?.email,
        },
        priority: 8,
      });

      logger.info(
        { subscriptionId, companyId, daysUntilExpiry: calculatedDaysUntilExpiry },
        'Plan expiry reminder sent'
      );

      return {
        processed: true,
        daysUntilExpiry: calculatedDaysUntilExpiry,
        reminderSent: true,
      };
    }

    return {
      processed: false,
      daysUntilExpiry: calculatedDaysUntilExpiry,
      reason: 'Not a reminder day',
    };
  } catch (err) {
    logger.error({ err: err.message, jobId: job._id }, 'Plan expiry reminder failed');
    throw err;
  }
}

// Main worker entry point
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose();
      logger.info('Plan Expiry Reminder Worker started');

      baseWorkerLoop({
        workerId: 'planExpiryReminderWorker-' + process.pid,
        jobTypes: ['subscription.expiry_reminder'],
        processFunc: planExpiryReminderProcessor,
        pollInterval: 5000, // Poll every 5 seconds
      });
    } catch (err) {
      logger.error(err, 'Failed to start Plan Expiry Reminder Worker');
      process.exit(1);
    }
  })();
}

module.exports = { planExpiryReminderProcessor };
