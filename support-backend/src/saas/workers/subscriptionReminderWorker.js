const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { enqueueJob } = require('../libs/jobQueue');
const subscriptionModel = require('../models/subscription.model');

// Worker to notify when subscription usage/elapsed reaches thresholds (90% etc.)
module.exports = async function runSubscriptionReminderWorker() {
  const now = Date.now();
  // Find active subscriptions not yet notified for 90% and with startAt/endAt present
  const subs = await subscriptionModel.find({ status: 'ACTIVE', 'notifications.notified90pct': { $ne: true }, startAt: { $exists: true }, endAt: { $exists: true } }).lean();
  for (const s of subs) {
    try {
      if (!s.startAt || !s.endAt) continue;
      const start = Number(new Date(s.startAt).getTime());
      const end = Number(new Date(s.endAt).getTime());
      if (!start || !end || end <= start) continue;
      const elapsed = now - start;
      const total = end - start;
      const pct = (elapsed / total) * 100;
      if (pct >= 90) {
        // mark subscription as notified (to avoid duplicates)
        await subscriptionModel.updateOne({ _id: s._id }, { $set: { 'notifications.notified90pct': true } });
        // enqueue notification
        await enqueueJob({ type: 'notify.company', payload: { companyId: s.companyId, type: 'SUBSCRIPTION_90PCT', subscriptionId: s._id } });
      }
    } catch (err) {
      console.error('Error in subscriptionReminderWorker for', s._id, err);
    }
  }
};
