const { initWorker } = require("../bootstrap/workerBootstrap");
const { enqueueJob } = require("../../libs/jobQueue");

const subscriptionModel = require("../../models/subscription.model");
const Company = require("../../models/company.model");
const orderModel = require("../../models/order.model");

/**
 * SUBSCRIPTION EXPIRY WORKER
 * ===========================
 * 
 * Handles subscription lifecycle transitions when subscriptions reach their endAt date.
 * 
 * GRACE PERIOD LOGIC:
 * - ACTIVE subscriptions at endAt typically enter GRACE period (default: 7 days)
 * - Grace period allows customer time to reactivate/renew without losing data
 * - After graceEndAt, subscription moves to EXPIRED status
 * 
 * PAID RENEWAL OPTIMIZATION:
 * - If a PAID renewal/reactivate order exists for the same company:
 *   → Skip GRACE period entirely
 *   → Go directly to EXPIRED
 *   → Allows activationWorker to start the new subscription immediately at intendedStartAt
 *   → No service interruption for customers who already paid
 * 
 * FLOW:
 * 1. Find ACTIVE subscriptions past endAt
 * 2. Check for paid RENEWAL/REACTIVATE orders
 * 3. If paid order exists → EXPIRED immediately (no grace)
 * 4. If no paid order and within grace → GRACE lifecycle
 * 5. If no paid order and past grace → EXPIRED
 * 6. On EXPIRED: reset company limits, clear addons, send notification
 */

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const DAY_MS = 24 * 60 * 60 * 1000;

async function runSubscriptionExpiryWorker() {
  const now = 1779629469000//Date.now();

  console.log("⏳ Checking for expired subscriptions at:", now);

  const activeExpiredSubs = await subscriptionModel
    .find({ status: "ACTIVE", endAt: { $lte: now } })
    .lean();

  const graceExpiredSubs = await subscriptionModel
    .find({ lifecycle: "GRACE", graceEndAt: { $lte: now } })
    .lean();

  const subs = [...activeExpiredSubs, ...graceExpiredSubs];

  if (!subs.length) {
    console.log("✅ No expired subscriptions found");
    return;
  }

  console.log(`🚀 Processing ${subs.length} expired subscriptions`);

  for (const s of subs) {
    try {
      console.log(`\n🔁 Processing subscription: ${s._id}`);

      // 1️⃣ Check if there's a PAID renewal/reactivate order for this company
      // If yes, skip GRACE and go directly to EXPIRED
      const paidRenewalOrder = await orderModel.findOne({
        companyId: s.companyId,
        status: "paid",
        orderType: { $in: ["SUBSCRIPTION_RENEWAL", "SUBSCRIPTION_REACTIVATE"] }
      }).lean();

      const graceDays = s.graceDays || 7;
      const graceEnd = s.endAt + (graceDays * DAY_MS);

      if (now <= graceEnd && !paidRenewalOrder) {
        // Enter grace period (only if NO paid renewal exists)
        await subscriptionModel.updateOne(
          { _id: s._id },
          { $set: { lifecycle: "GRACE", graceStartAt: now, graceEndAt: graceEnd, lastCheckedAt: now } }
        );
        console.log(`✅ Entered grace period: ${s._id}`);
      } else {
        // Mark as expired when:
        // - Grace period has passed, OR
        // - A paid renewal/reactivate order exists (activate immediately)
        await subscriptionModel.updateOne(
          { _id: s._id },
          { $set: { status: "EXPIRED", lifecycle: "EXPIRED", expiredAt: now, lastCheckedAt: now } }
        );

        if (paidRenewalOrder) {
          console.log(`⚡ Paid renewal found! Skipping grace period. Going directly to EXPIRED: ${s._id}`);
          console.log(`   Renewal Order: ${paidRenewalOrder._id} | Activation will start immediately`);
        } else {
          console.log(`✅ Grace period expired. Marking as EXPIRED: ${s._id}`);
        }
        try {
          const company = await Company.findById(s.companyId).lean();
          const fallbackLimits =
            company?.planSnapshot?.userPricing || {};

          await Company.updateOne(
            { _id: s.companyId, activeSubscriptionId: s._id },
            {
              $unset: { activeSubscriptionId: 1 },
              $set: {
                status: "expired",
                selectedAddons: {},
                effectiveUserLimits: fallbackLimits,
              },
            }
          );
        } catch (e) {
          console.error("❌ Company update failed:", e.message);
        }

        // 3️⃣ Send notification job
        await enqueueJob({
          type: "notify.company",
          payload: {
            companyId: s.companyId,
            type: "SUBSCRIPTION_EXPIRED",
            subscriptionId: s._id,
          },
        });

        // 4️⃣ Optional: fetch paid order if needed later
        await orderModel
          .findOne({
            subscriptionId: s._id,
            status: "paid",
          })
          .lean();

        console.log(`✅ Completed expiry: ${s._id}`);
      }

      // 💤 2 sec delay to avoid DB pressure
      await delay(2000);

    } catch (err) {
      console.error("🔥 Error processing subscription:", s._id, err);
    }
  }
}

async function start() {
  try {
    await initWorker();
    await runSubscriptionExpiryWorker();
    console.log("\n🎉 Subscription expiry worker completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Worker failed", err);
    process.exit(1);
  }
}

start();

module.exports = runSubscriptionExpiryWorker;