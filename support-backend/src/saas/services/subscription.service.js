const Subscription = require("../models/subscription.model");
const Company = require("../models/company.model");
const Plan = require("../models/plan.model");
const Addon = require("../models/addon.model");
const WalletService = require("./wallet.service");
const Refund = require("../models/refund.model");
const { SubscriptionStatus } = require("../constants/subscription.constant");
const env = require("../config/env");
const { enqueueJob } = require("../libs/jobQueue");

/* ---------------------------------- Helpers ---------------------------------- */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function differenceInDays(dateLeft, dateRight) {
  const oneDayMs = 1000 * 60 * 60 * 24;
  const start = new Date(dateLeft).setHours(0, 0, 0, 0);
  const end = new Date(dateRight).setHours(0, 0, 0, 0);
  return Math.round((start - end) / oneDayMs);
}

/**
 * Calculates remaining credit from old plan and amount to pay for the new plan
 */
async function calculatePlanUpgrade(companyId, oldSubscription, oldPlan, newPlan, payment) {
  const totalDays = Math.max(1, differenceInDays(oldSubscription.endDate, oldSubscription.startDate));
  const originalPricePaise = oldPlan.originalPricePaise || oldPlan.pricePaise || 0;
  const dailyCostPaise = Math.floor(originalPricePaise / totalDays);

  const today = new Date();
  const usedDays = Math.max(0, differenceInDays(today, oldSubscription.startDate));
  const usedAmountPaise = Math.floor(dailyCostPaise * usedDays);

  const remainingAmountPaise = Math.floor(dailyCostPaise * (totalDays - usedDays));
  const totalPaidPaise = payment.amountPaise || 0;
  const remainingCreditPaise = Math.max(totalPaidPaise - usedAmountPaise, 0);

  const newPlanPricePaise = newPlan.pricePaise || 0;
  const newPlanAmountToPayPaise = Math.max(0, newPlanPricePaise - remainingCreditPaise);

  return {
    remainingCreditPaise,
    newPlanAmountToPayPaise,
  };
}

/* ------------------------------ Service Class ------------------------------ */
class SubscriptionService {
  /* -------------------------- 1️⃣ New Subscription -------------------------- */
  static async newSubscription(companyId, plan, payment) {
    const startDate = new Date();
    const endDate = addDays(startDate, plan.durationDays || env.DEFAULT_BILLING_DAYS);

    const sub = await Subscription.create({
      company: companyId,
      planId: plan._id,
      planSnapshot: plan,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
      paymentIds: payment?._id ? [payment._id] : [],
    });

    await Company.findByIdAndUpdate(companyId, {
      $set: { subscription: sub._id, status: "ACTIVE", statusReason: null },
      $push: {
        transactions: {
          type: "NEW_SUBSCRIPTION",
          paymentId: payment?._id,
          amountPaise: payment?.amountPaise || 0,
          date: new Date(),
        },
      },
    });

    // Schedule expiry job
    await enqueueJob({
      type: "subscription.expiry_schedule",
      payload: { subscriptionId: sub._id, companyId },
      scheduledAt: endDate.getTime(),
      priority: 10,
    });

    return sub;
  }

  /* --------------------------- 2️⃣ Renewal Logic --------------------------- */
  static async renewSubscription(companyId, plan, payment) {
    const company = await Company.findById(companyId)
    if (!company.subscription) throw new Error("No active subscription");

    const sub = await Subscription.findById(company.subscription);
    const startDate = new Date(sub.endDate);
    const endDate = addDays(startDate, plan.durationDays || env.DEFAULT_BILLING_DAYS);

    sub.endDate = endDate;
    sub.paymentIds.push(payment._id);
    await sub.save();

    await Company.updateOne(
      { _id: companyId },
      {
        $push: {
          transactions: {
            type: "RENEWAL",
            paymentId: payment._id,
            amountPaise: payment.amountPaise,
            date: new Date(),
          },
        },
      }
    );

    return sub;
  }

  /* ---------------------------- 3️⃣ Apply Addon ---------------------------- */
  static async applyAddon(companyId, addonId, payment) {
    const addon = await Addon.findById(addonId);
    if (!addon) throw new Error("Addon not found");

    const company = await Company.findById(companyId);
    company.appliedAddons = company.appliedAddons || [];

    company.appliedAddons.push({
      addonId: addon._id,
      units: 1,
      status: "ACTIVE",
      appliedAt: new Date(),
      expiresAt: addon.durationDays ? addDays(new Date(), addon.durationDays) : null,
      paymentRef: payment._id,
    });

    company.plan = company.plan || { userPricing: {} };
    for (const [k, v] of Object.entries(addon.provides || {})) {
      company.plan.userPricing[k] = (company.plan.userPricing[k] || 0) + v;
    }

    await company.save();
    return company;
  }

  /* -------------------- 4️⃣ Upgrade / Downgrade Plan -------------------- */
  static async changePlan(companyId, newPlan, payment, opts = { immediate: true }) {
    const company = await Company.findById(companyId).populate("subscription");
    const currentSub = await Subscription.findById(company.subscription);
    const currentPlan = currentSub ? await Plan.findById(currentSub.planId) : null;
    const today = new Date();

    if (!currentSub || !currentPlan) {
      return this.newSubscription(companyId, newPlan, payment);
    }

    const { remainingCreditPaise, newPlanAmountToPayPaise } = await calculatePlanUpgrade(
      companyId,
      currentSub,
      currentPlan,
      newPlan,
      payment
    );

    if (remainingCreditPaise > 0) {
      await WalletService.addAmount(
        companyId,
        remainingCreditPaise,
        "PLAN_CREDIT",
        payment._id
      );

      // ✅ Refund linked to paymentId
      await Refund.create({
        companyId,
        subscriptionId: currentSub._id,
        paymentId: payment._id,
        amountPaise: remainingCreditPaise,
        reason: `Wallet credited for unused ${
          differenceInDays(currentSub.endDate, currentSub.startDate) -
          differenceInDays(today, currentSub.startDate)
        } days of ${currentPlan.name}`,
        status: "CREDITED_TO_WALLET",
        createdBy: payment.createdBy,
      });

      // ✅ Add a transaction entry for the refund/credit
      await Company.findByIdAndUpdate(companyId, {
        $push: {
          transactions: {
            type: "PLAN_REFUND_CREDIT",
            paymentId: payment._id,
            amountPaise: remainingCreditPaise,
            date: new Date(),
            note: "Remaining amount credited to wallet after plan cancellation/refund",
          },
        },
      });
    }

    // Mark current subscription as ended
    currentSub.isActive = false;
    currentSub.status = newPlan.pricePaise > currentPlan.pricePaise ? "UPGRADED" : "DOWNGRADED";
    currentSub.endDate = today;
    currentSub.paymentIds.push(payment._id); // ✅ Link payment
    await currentSub.save();

    // Start new subscription with new plan
    return this.newSubscription(companyId, newPlan, payment);
  }

  /* ------------------------- 5️⃣ Apply Payment Event ------------------------- */
  static async applyPayment(order, payment, planData = null) {
    if (order.type === "PLAN") {
      const plan = planData || (await Plan.findById(order.targetId));
      if (!plan) throw new Error("Plan not found");

      if (order.renewalType === "RENEWAL") {
        return this.renewSubscription(order.company, plan, payment);
      } else if (order.renewalType === "UPGRADE" || order.renewalType === "DOWNGRADE") {
        return this.changePlan(order.company, plan, payment);
      } else {
        return this.newSubscription(order.company, plan, payment);
      }
    } else if (order.type === "ADDON") {
      return this.applyAddon(order.company, order.targetId, payment);
    } else if (order.type === "WALLET_TOPUP") {
      return WalletService.addAmount(order.company, payment.amountPaise, "RAZORPAY_TOPUP", payment._id);
    }
  }
}

module.exports = SubscriptionService;
