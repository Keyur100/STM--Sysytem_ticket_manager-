// src/saas/services/plan.service.js
const mongoose = require('mongoose');
const moment = require('moment');
const Plan = require('../models/plan.model');
const Subscription = require('../models/subscription.model');
const Company = require('../models/company.model');
const Wallet = require('../models/wallet.model');
const { Job } = require('../models/job.model');
const { JOB_TYPES } = require('../constants/job.constant');
// const Audit = require('../models/audit.model');

class PlanService {

  /**
   * Create a new plan
   */
  static async createPlan(data, userId) {
    const plan = new Plan({ ...data, createdBy: userId, updatedBy: userId });
    await plan.save();

    // enqueue audit log
    await PlanService.enqueueAudit('plan', plan._id, 'CREATE', null, plan, userId);

    return plan;
  }


  /**
   * Get plan by code
   */
  static async getPlanByCode(code) {
    return Plan.findOne({ code, isActive: true });
  }

  /**
   * Update a plan
   */
  static async updatePlan(planId, data, userId) {
    const oldPlan = await Plan.findById(planId);
    if (!oldPlan) throw new Error('Plan not found');

    const updatedPlan = await Plan.findByIdAndUpdate(planId, { ...data, updatedBy: userId }, { new: true });

    // enqueue audit log
    await PlanService.enqueueAudit('plan', planId, 'UPDATE', oldPlan, updatedPlan, userId);

    return updatedPlan;
  }

  /**
   * Delete a plan
   */
  static async deletePlan(planId, userId) {
    const oldPlan = await Plan.findById(planId);
    if (!oldPlan) throw new Error('Plan not found');

    oldPlan.isActive = false;
    await oldPlan.save();

    // enqueue audit log
    await PlanService.enqueueAudit('plan', planId, 'DELETE', oldPlan, null, userId);

    return true;
  }

  /**
   * Upgrade or downgrade subscription with proration
   */
  static async upgradeSubscription(companyId, newPlanId, effectiveDate = new Date()) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const company = await Company.findById(companyId).session(session);
      if (!company) throw new Error('Company not found');

      const newPlan = await Plan.findById(newPlanId).session(session);
      if (!newPlan || !newPlan.isActive) throw new Error('Plan invalid or inactive');

      const oldSubscription = await Subscription.findOne({ company: companyId, status: 'ACTIVE' }).session(session);
      if (!oldSubscription) throw new Error('Active subscription not found');

      const start = moment(effectiveDate);
      const billingStart = moment(oldSubscription.startDate);
      const billingEnd = moment(oldSubscription.endDate);

      const totalDays = billingEnd.diff(billingStart, 'days') + 1;
      const daysUsed = start.diff(billingStart, 'days');
      const daysRemaining = totalDays - daysUsed;

      // Old plan daily rate (paisa)
      const oldDailyRate = Math.round(oldSubscription.planSnapshot.pricePaise / totalDays);
      const creditPaisa = oldDailyRate * daysRemaining;

      // New plan daily rate (paisa)
      const newDailyRate = Math.round(newPlan.pricePaise / totalDays);
      const chargePaisa = newDailyRate * daysRemaining;

      // Net amount (paisa)
      const netPaisa = chargePaisa - creditPaisa;

      // enqueue wallet deduction job
      await PlanService.enqueueJob(JOB_TYPES.WALLET_DEDUCT, {
        companyId,
        amountPaise: netPaisa,
        reason: `Prorated upgrade from ${oldSubscription.planSnapshot.code} to ${newPlan.code}`
      });

      // update subscription
      oldSubscription.planId = newPlan._id;
      oldSubscription.planSnapshot = newPlan.toObject();
      oldSubscription.updatedBy = null; // system
      await oldSubscription.save({ session });

      // enqueue audit log
      await PlanService.enqueueAudit('subscription', oldSubscription._id, 'UPGRADE_PRORATE', null, oldSubscription, null);

      await session.commitTransaction();
      session.endSession();

      return { creditPaisa, chargePaisa, netPaisa };

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * Downgrade plan: scheduled or immediate
   */
  static async downgradeSubscription(companyId, newPlanId, immediate = false, effectiveDate = new Date()) {
    if (immediate) {
      return PlanService.upgradeSubscription(companyId, newPlanId, effectiveDate);
    } else {
      const subscription = await Subscription.findOne({ company: companyId, status: 'ACTIVE' });
      if (!subscription) throw new Error('Active subscription not found');

      subscription.scheduledDowngradeTo = newPlanId;
      await subscription.save();

      await PlanService.enqueueAudit('subscription', subscription._id, 'SCHEDULED_DOWNGRADE', null, subscription, null);

      return subscription;
    }
  }

  /**
   * Cancel subscription with optional proration refund
   */
  static async cancelSubscription(companyId, proratedRefund = false) {
    const subscription = await Subscription.findOne({ company: companyId, status: 'ACTIVE' });
    if (!subscription) throw new Error('Active subscription not found');

    const company = await Company.findById(companyId);
    const endDate = moment(subscription.endDate);
    const today = moment();
    let refundPaisa = 0;

    if (proratedRefund && today.isBefore(endDate)) {
      const totalDays = endDate.diff(moment(subscription.startDate), 'days') + 1;
      const daysRemaining = endDate.diff(today, 'days');
      const dailyRate = Math.round(subscription.planSnapshot.pricePaise / totalDays);
      refundPaisa = dailyRate * daysRemaining;

      await PlanService.enqueueJob(JOB_TYPES.PAYMENT_REFUND, {
        companyId,
        amountPaise: refundPaisa,
        reason: `Prorated subscription cancellation`
      });
    }

    subscription.status = 'CANCELLED';
    await subscription.save();

    await PlanService.enqueueAudit('subscription', subscription._id, 'CANCEL', null, subscription, null);

    return { refundPaisa };
  }

  /**
   * Utility: enqueue audit log
   */
  static async enqueueAudit(entityType, entityId, action, before, after, userId) {
    await PlanService.enqueueJob(JOB_TYPES.AUDIT_LOG, {
      entityType,
      entityId,
      action,
      before,
      after,
      createdBy: userId
    });
  }

  /**
   * Generic job enqueue helper
   */
  static async enqueueJob(type, payload) {
    const job = new Job({
      type,
      payload,
      status: 'PENDING',
      retries: 0,
      maxRetries: 5,
      scheduledAt: Date.now()
    });
    await job.save();
    return job;
  }

  /**
 * Get all active plans (for SaaS)
 */
// src/saas/services/plan.service.js
static async getAllPlans({ isActive = true, planGroup, billingCycle, search, page = 1, limit = 20 }) {
  const filter = {};

  if (isActive !== undefined) filter.isActive = isActive;
  if (planGroup) filter.planGroup = planGroup;
  if (billingCycle) filter.billingCycle = billingCycle;
  if (search) {
    filter.$or = [
      { code: new RegExp(search, "i") },
      { name: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
    ];
  }

  const total = await Plan.countDocuments(filter);
  const plans = await Plan.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    plans,
    total,
    page,
    limit,
  };
}



}

module.exports = PlanService;
