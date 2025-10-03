// subscription.service.js
// src/saas/services/subscription.service.js
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");
const Company = require("../models/company.model");
const Addon = require("../models/addon.model");
const WalletService = require("./wallet.service");
const { env, SubscriptionStatus } = require("../constants/saas.constant");
const { enqueueJob } = require("../libs/jobQueue");

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a, b) {
  const ms = Math.max(0, b - a);
  return Math.ceil(ms / (24 * 3600 * 1000));
}

function daysInPeriod(startDate, endDate) {
  // exact days between start and end (inclusive/exclusive decision)
  return daysBetween(startDate, endDate);
}

// 🔹 Now the behavior is strict:

// Default plan → free or auto-assigned (no payment check).

// Paid plan upgrade/new subscription → requires payment, otherwise throws
// coupn wallet actual payment flow 
class SubscriptionService {
  static async _createSubscriptionAndApplyToCompany({
    companyId,
    plan,
    startDate = new Date(),
    createdBy = null,
    updatedBy = null,
    payment = null,
    handleAddons = false, // toggle whether we apply addons or not
  }) {
    const duration = plan?.durationDays || env.DEFAULT_BILLING_DAYS;
    const endDate = addDays(startDate, duration);

    const sub = await Subscription.create({
      company: companyId,
      planId: plan ? plan._id : null,
      planSnapshot: plan || {},
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE, //TODO if payment is not done then  PENDING_PAYMENT and payment webhook update subscription as well payment status
      billingCycle: plan?.billingCycle|| env.DEFAULT_BILLING_CYCLE,
      createdBy,updatedBy
    });

    const company = await Company.findById(companyId);

    company.subscription = sub._id;
    // company.plan = plan|| null;
    // company.effectivePermissions = plan?.modulePermissions || {};

    // limits
    // if (plan?.userPricing) {
    //   company.plan.userPricing.storageMB =
    //     plan.userPricing.storageMB || company.plan.userPricing.storageMB 
    //   company.plan.userPricing.max_employees = Math.max(
    //     company.plan.userPricing.max_employees || 0,
    //     plan.userPricing.maxUsers ||
    //       (Array.isArray(plan.userPricing.max_employees)
    //         ? Math.max(...plan.userPricing.max_employees)
    //         : 0)
    //   );
    //   company.plan.userPricing.max_suppliers = plan.userPricing.maxSuppliers || 0;
    //   company.plan.userPricing.max_branch = plan.userPricing.maxBranches || 0;
    //   company.plan.userPricing.max_customers = plan.userPricing.maxClients || 0;
    //   company.plan.userPricing.max_reseller = plan.userPricing.maxResellers || 0;
    // }

    // optional: handle addons
    if (handleAddons) {
      const pending = company.pendingAddons || [];
      const onHold = (company.appliedAddons || []).filter(
        (a) => a.status === "ON_HOLD" || a.status === "PENDING"
      );
      const toApply = [...pending, ...onHold];

      for (const p of toApply) {
        const addonId = p.addonId || p.addon;
        const addon = await Addon.findById(addonId);
        if (!addon) continue;
        const provides = addon.provides || {};
        for (const k of Object.keys(provides)) {
          company.plan.userPricing[k] = (company.plan.userPricing[k] || 0) + provides[k] * (p.units || 1);
        }
        company.appliedAddons = company.appliedAddons || [];
        const exists = company.appliedAddons.find(
          (a) => a.addonId && a.addonId.toString() === addon._id.toString()
        );
        if (exists) {
          exists.status = "ACTIVE";
          exists.appliedAt = new Date();
          exists.expiresAt = addon.durationDays
            ? addDays(new Date(), addon.durationDays)
            : null; //todo expirty for addons like subscription
        } else {
          company.appliedAddons.push({
            addonId: addon._id,
            units: p.units || 1,
            status: "ACTIVE",
            purchasedAt: p.purchasedAt || new Date(),
            appliedAt: new Date(),
            expiresAt: addon.durationDays
              ? addDays(new Date(), addon.durationDays)
              : null,
            paymentRef: p.paymentRef || (payment ? payment._id : null),
          });
        }
      }
      company.pendingAddons = [];
    }

    // track payment
    if (payment) {
      company.transactions = company.transactions || [];
      company.transactions.push({
        type: "SUBSCRIPTION_PURCHASE",
        amountPaise: payment.amountPaise,
        paymentId: payment._id,
        date: new Date(),
      });
    }

    company.status = "ACTIVE";//TODO - EMAIL ACCEPT AT THAT TIME intially
    company.statusReason = null;
    await company.save();

    // schedule expiry job
    await enqueueJob({
      type: "subscription.expiry_schedule",
      payload: { subscriptionId: sub._id, companyId },
      scheduledAt: endDate.getTime(),
      priority: 10,
    });

    return sub;
  }

  static async assignDefaultPlan(companyId, createdBy = null,updatedBy=null,plan,payment) {
    return this._createSubscriptionAndApplyToCompany({
      companyId,
      plan,
      createdBy,
      updatedBy,
      handleAddons: false,
      payment
    });
  }

  static async activateNewSubscriptionAfterPayment(
    companyId,
    planCode,
    payment = null,
    createdBy = null
  ) {
    const plan = await Plan.findOne({ code: planCode });
    if (!plan) throw new Error("Plan not found");

    // upgrade old ones
    await Subscription.updateMany(
      { company: companyId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.UPGRADED }
    );

    return this._createSubscriptionAndApplyToCompany({
      companyId,
      plan,
      createdBy,
      payment,
      handleAddons: true,
    });
  }

  static async scheduleDowngrade(companyId, targetPlanCode) {
    const plan = await Plan.findOne({ code: targetPlanCode });
    if (!plan) throw new Error("Target plan not found");
    const sub = await Subscription.findOne({
      company: companyId,
      status: SubscriptionStatus.ACTIVE,
    });
    if (!sub)
      throw new Error("No active subscription to schedule downgrade for");
    sub.scheduledDowngradeTo = plan._id;
    await sub.save();

    // enqueue job to run at subscription.endDate to apply scheduled downgrade
    await enqueueJob({
      type: "subscription.apply_scheduled_downgrade",
      payload: { subscriptionId: sub._id, targetPlanId: plan._id, companyId },
      scheduledAt: sub.endDate.getTime(),
      priority: 10,
    });
    return sub;
  }

  // apply scheduled downgrade when sub expires (workers will call this job)
  static async applyScheduledDowngradeIfAny(expiredSub) {
    if (!expiredSub.scheduledDowngradeTo) return null;
    const targetPlan = await Plan.findById(expiredSub.scheduledDowngradeTo); // here scheduledDowngradeTo-- id??doto
    if (!targetPlan) return null;
    return this.activateNewSubscriptionAfterPayment(
      expiredSub.company,
      targetPlan.code,
      null
    );
  }

  // upgrade: calculates prorata credit/charge and optionally credits wallet/creates invoices
  static async upgradePlan(
    companyId,
    newPlanCode,
    opts = { proRate: false, createdBy: null, autoPayMethod: null }
  ) {
    const current = await Subscription.findOne({
      company: companyId,
      status: SubscriptionStatus.ACTIVE,
    });
    const newPlan = await Plan.findOne({ code: newPlanCode });
    if (!newPlan) throw new Error("New plan not found");

    // if no active subscription, treat as normal activation
    if (!current) {
      return this.activateNewSubscriptionAfterPayment(
        companyId,
        newPlanCode,
        null, //doto -without payment how activated
        opts.createdBy
      );
    }

    // compute proration if requested
    if (opts.proRate) {
      const now = new Date();
      const oldPrice = current.planSnapshot?.pricePaise || 0;
      const newPrice = newPlan.pricePaise || 0;
      // days in billing cycle: endDate - startDate
      const totalDays = daysBetween(current.startDate, current.endDate) || 1;
      const usedDays = daysBetween(current.startDate, now);
      const remainingDays = Math.max(0, totalDays - usedDays);

      // credit for old plan unused days
      const dailyOld = Math.round(oldPrice / totalDays);
      const credit = Math.round(dailyOld * remainingDays); //old credit

      // charge for new plan for remaining days
      const dailyNew = Math.round(newPrice / totalDays);
      const charge = Math.round(dailyNew * remainingDays); // new charge

      const netCharge = Math.max(0, charge - credit);
      const netCredit = Math.max(0, credit - charge);

      // apply credit/charge logic
      if (netCharge > 0) {
        // if wallet has sufficient balance and opted, debit it, else create order and leave for payment
        if (opts.autoPayMethod === "WALLET") {
          const deb = await WalletService.debitIfSufficient(
            companyId,
            netCharge
          );
          if (deb) {
            // create order/payment record as paid
            const Order = require("../models/order.model");
            const Payment = require("../models/payment.model");
            const order = await Order.create({
              company: companyId,
              type: "PLAN",
              targetId: newPlan._id,
              amountPaise: netCharge,
              status: "PAID",
              createdBy: opts.createdBy,
            });
            const payment = await Payment.create({
              order: order._id,
              company: companyId,
              amountPaise: netCharge,
              method: "WALLET",
              status: "SUCCESS",
              createdBy: opts.createdBy,
            });
            // proceed to upgrade
          } else {
            // Could not pay: create pending order
            const Order = require("../models/order.model");
            await Order.create({
              company: companyId,
              type: "PLAN",
              targetId: newPlan._id,
              amountPaise: netCharge,
              status: "PENDING",
              createdBy: opts.createdBy,
            });
            // enqueue payment reminder/reconciliation job
            await enqueueJob({
              type: "payment.reconcile",
              payload: { companyId, planCode: newPlanCode },
              scheduledAt: Date.now() + 1000 * 60 * 60 * 24,
              priority: 5,
            });
          }
        } else {
          // create pending order for manual payment
          const Order = require("../models/order.model");
          await Order.create({
            company: companyId,
            type: "PLAN",
            targetId: newPlan._id,
            amountPaise: netCharge,
            status: "PENDING",
            createdBy: opts.createdBy,
          });
        }
      } else if (netCredit > 0) {
        // credit wallet
        await WalletService.credit(companyId, netCredit, {
          note: "prorata credit for upgrade",
        });
        await enqueueJob({
          type: "audit.log_event",
          payload: {
            action: "prorata.credit",
            companyId,
            amountPaise: netCredit,
          },
          priority: 10,
        });
      }
    }

    // mark the old subscription UPGRADED and create new active one
    current.status = SubscriptionStatus.UPGRADED;
    await current.save();

    const newSub = await this.activateNewSubscriptionAfterPayment(
      companyId,
      newPlanCode,
      null,
      opts.createdBy
    );

    // enqueue audit
    await enqueueJob({
      type: "audit.log_event",
      payload: { action: "subscription.upgrade", companyId, newPlanCode },
      priority: 10,
    });

    return newSub;
  }
}

module.exports = SubscriptionService;

// TODO
// with payment  data

// company.service.js

// static async _createSubscriptionAndApplyToCompany({
//   companyId,
//   plan,
//   createdBy = null,
//   payment = null,
//   handleAddons = false,
// }) {
//   const now = new Date();
//   const duration = plan?.durationDays || env.DEFAULT_BILLING_DAYS;
//   const end = addDays(now, duration);

//   // create subscription
//   const sub = await Subscription.create({
//     company: companyId,
//     planId: plan ? plan._id : null,
//     planSnapshot: plan ? plan.toObject() : {},
//     startDate: now,
//     endDate: end,
//     status: SubscriptionStatus.ACTIVE,
//     billingCycle: plan?.billingCycle || env.DEFAULT_BILLING_CYCLE,
//     createdBy,
//     ...(payment ? { paymentId: payment._id } : {}),
//   });

//   // apply plan limits & permissions to company
//   const patch = {
//     plan: plan ? plan._id : null,
//     subscription: sub._id,
//     effectivePermissions: plan?.modulePermissions || {},
//     storageMB: plan?.userPricing?.storageMB || 150 * 1024,
//     max_employees: plan?.userPricing?.maxUsers || 0,
//     max_suppliers: plan?.userPricing?.maxSuppliers || 0,
//     max_branch: plan?.userPricing?.maxBranches || 0,
//     max_customers: plan?.userPricing?.maxClients || 0,
//     max_reseller: plan?.userPricing?.maxResellers || 0,
//   };
//   await Company.findByIdAndUpdate(companyId, patch);

//   // log transaction only if payment exists
//   if (payment) {
//     await PaymentService.logTransaction({
//       companyId,
//       subscriptionId: sub._id,
//       payment,
//       plan,
//       createdBy,
//     });
//   }

//   // schedule expiry job
//   await enqueueJob({
//     type: "subscription.expiry_schedule",
//     payload: { subscriptionId: sub._id, companyId },
//     scheduledAt: end.getTime(),
//     priority: 10,
//   });

//   // handle addons if needed
//   if (handleAddons && plan?.addons?.length) {
//     await SubscriptionService.attachAddons(sub._id, plan.addons, companyId);
//   }

//   return sub;
// }

// /**
//  * Assign default plan to company (free, no payment).
//  */
// static async assignDefaultPlan(companyId, createdBy = null) {
//   const plan = await Plan.findOne({ code: env.DEFAULT_PLAN_CODE });
//   return this._createSubscriptionAndApplyToCompany({
//     companyId,
//     plan,
//     createdBy,
//     payment: null,       // no payment for free plan
//     handleAddons: false, // default usually has no addons
//   });
// }

// /**
//  * Activate paid subscription after successful payment.
//  */
// static async activateNewSubscriptionAfterPayment(
//   companyId,
//   planCode,
//   payment,
//   createdBy = null
// ) {
//   if (!payment) {
//     throw new Error("Payment is required to activate subscription");
//   }

//   const plan = await Plan.findOne({ code: planCode });
//   if (!plan) throw new Error("Plan not found");

//   // mark existing active subs as upgraded
//   await Subscription.updateMany(
//     { company: companyId, status: SubscriptionStatus.ACTIVE },
//     { status: SubscriptionStatus.UPGRADED }
//   );

//   return this._createSubscriptionAndApplyToCompany({
//     companyId,
//     plan,
//     createdBy,
//     payment,
//     handleAddons: true, // paid plans may include addons
//   });
// }
