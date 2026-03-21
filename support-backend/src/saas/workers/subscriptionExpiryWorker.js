const { initWorker } = require("./bootstrap/workerBootstrap");

const { enqueueJob } = require("../libs/jobQueue");
const subscriptionModel = require("../models/subscription.model");
const CompanyService = require("../services/company.service");
const Company = require("../models/company.model");
const orderModel = require("../models/order.model");

async function runSubscriptionExpiryWorker() {
  const now = Date.now();

  const subs = await subscriptionModel
    .find({ status: "ACTIVE", endAt: { $lte: now } })
    .lean();

  if (!subs.length) {
    console.log("No expired subscriptions found");
    return;
  }

  console.log(`Processing ${subs.length} expired subscriptions`);

  for (const s of subs) {
    try {

      await subscriptionModel.updateOne(
        { _id: s._id },
        { $set: { status: "EXPIRED", expiredAt: now } }
      );

      // Clear activeSubscriptionId and reset company-level addon/limits
      try {
        const company = await Company.findById(s.companyId).lean().catch(() => null);
        const planSnapshot = company && company.planSnapshot ? company.planSnapshot : null;
        const fallbackLimits = (planSnapshot && planSnapshot.userPricing) ? planSnapshot.userPricing : {};
        await Company.updateOne(
          { _id: s.companyId, activeSubscriptionId: s._id },
          { $unset: { activeSubscriptionId: 1 }, $set: { status: "expired", selectedAddons: {}, effectiveUserLimits: fallbackLimits } }
        ).catch(() => {});
      } catch (e) {
        console.error('Failed updating company after subscription expiry', s.companyId, e);
      }

      await enqueueJob({
        type: "notify.company",
        payload: {
          companyId: s.companyId,
          type: "SUBSCRIPTION_EXPIRED",
          subscriptionId: s._id
        }
      });

      const paidOrder = await orderModel
        .findOne({
          subscriptionId: s._id,
          status: "paid"
        })
        .lean();

     

    } catch (err) {
      console.error(
        "Error processing subscription",
        s._id,
        err
      );
    }
  }
}

async function start() {
  try {
    await initWorker();

    await runSubscriptionExpiryWorker();

    console.log("Subscription expiry worker completed");

    process.exit(0);

  } catch (err) {
    console.error("Subscription expiry worker failed", err);
    process.exit(1);
  }
}

start();

module.exports = runSubscriptionExpiryWorker;