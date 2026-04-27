const { initWorker } = require("../bootstrap/workerBootstrap");
const { enqueueJob } = require("../../libs/jobQueue");

const subscriptionModel = require("../../models/subscription.model");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function runSubscriptionReminderWorker() {
  const now = Date.now();

  // 3 days from now
  const threeDaysLater = now + 3 * 24 * 60 * 60 * 1000;

  console.log("⏳ Checking for subscriptions expiring in 3 days");

  const subs = await subscriptionModel
    .find({
      status: "ACTIVE",
      endAt: { $gte: now, $lte: threeDaysLater },
    })
    .lean();

  if (!subs.length) {
    console.log("✅ No upcoming expiries");
    return;
  }

  console.log(`🚀 Sending reminders for ${subs.length} subscriptions`);

  for (const s of subs) {
    try {
      console.log(`🔔 Reminder for subscription: ${s._id}`);

      await enqueueJob({
        type: "notify.company",
        payload: {
          companyId: s.companyId,
          type: "SUBSCRIPTION_EXPIRING_SOON",
          subscriptionId: s._id,
          expiresAt: s.endAt,
        },
      });

      console.log(`✅ Reminder sent: ${s._id}`);

      // 💤 2 sec delay
      await delay(2000);

    } catch (err) {
      console.error("🔥 Reminder failed:", s._id, err);
    }
  }
}

async function start() {
  try {
    await initWorker();
    await runSubscriptionReminderWorker();
    console.log("\n🎉 Subscription reminder worker completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Worker failed", err);
    process.exit(1);
  }
}

start();

module.exports = runSubscriptionReminderWorker;