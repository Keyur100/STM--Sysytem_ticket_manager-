const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const baseWorker = require('./baseWorker');
const Worker = require('../../models/worker.model');
const Company = require('../models/company.model');
const Subscription = require('../models/subscription.model');
const { sendSubscriptionReminderEmail, sendSubscriptionExpiryEmail } = require('../../utils/email.helper');

// Worker ID for this notification worker
const WORKER_ID = 'notification-worker-' + process.pid;

/**
 * Process a notification job
 * job.payload contains: { companyId, type: 'SUBSCRIPTION_90PCT' | 'SUBSCRIPTION_EXPIRED', subscriptionId }
 */
async function processNotificationJob(job) {
  const { companyId, type, subscriptionId } = job.payload;

  if (!companyId || !type) {
    throw new Error('Invalid notification job payload: missing companyId or type');
  }

  // Fetch company and subscription details
  const company = await Company.findById(companyId).lean().catch(() => null);
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const subscription = subscriptionId
    ? await Subscription.findById(subscriptionId).lean().catch(() => null)
    : null;

  // Extract email and contact info
  const recipientEmail = company.contact?.email;
  if (!recipientEmail) {
    throw new Error(`No email found for company ${companyId}`);
  }

  const companyName = company.name || 'Valued Customer';
  const planName = subscription?.planSnapshot?.name || subscription?.planId || 'Your Plan';

  try {
    switch (type) {
      case 'SUBSCRIPTION_90PCT': {
        // Send reminder email for 90% threshold
        const subscriptionEndDate = subscription
          ? new Date(subscription.endAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'N/A';

        await sendSubscriptionReminderEmail({
          to: recipientEmail,
          companyName,
          subscriptionEndDate,
          planName,
        });

        console.log(`[${WORKER_ID}] Sent 90% reminder email to ${recipientEmail} for company ${companyId}`);
        return { success: true, type, companyId, email: recipientEmail };
      }

      case 'SUBSCRIPTION_EXPIRED': {
        // Send expiry notification email
        const expiryDate = subscription
          ? new Date(subscription.endAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'today';

        await sendSubscriptionExpiryEmail({
          to: recipientEmail,
          companyName,
          planName,
          expiryDate,
        });

        console.log(`[${WORKER_ID}] Sent expiry notification email to ${recipientEmail} for company ${companyId}`);
        return { success: true, type, companyId, email: recipientEmail };
      }

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  } catch (emailErr) {
    console.error(`[${WORKER_ID}] Failed to send ${type} email to ${recipientEmail}:`, emailErr.message);
    throw new Error(`Email delivery failed: ${emailErr.message}`);
  }
}

/**
 * Start the notification worker
 */
async function startNotificationWorker() {
  console.log(`[${WORKER_ID}] Starting notification worker...`);

  try {
    await baseWorker({
      workerId: WORKER_ID,
      jobTypes: ['notify.company'], // Listen for notify.company job type
      processFunc: processNotificationJob,
      pollInterval: 5000, // Poll every 5 seconds
      WorkerModel: Worker,
    });
  } catch (err) {
    console.error(`[${WORKER_ID}] Worker failed:`, err);
    process.exit(1);
  }
}

// Start if run directly
if (require.main === module) {
  startNotificationWorker();
}

module.exports = startNotificationWorker;
