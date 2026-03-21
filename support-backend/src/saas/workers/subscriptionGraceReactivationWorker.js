const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { enqueueJob } = require('../libs/jobQueue');
const subscriptionModel = require('../models/subscription.model');
const orderModel = require('../models/order.model');
const CompanyService = require('../services/company.service');

// Worker to scan expired subscriptions within grace period and reactivate if a paid order exists
module.exports = async function runGraceReactivationWorker() {
  const now = Date.now();
  // Grace period days default (can be company-level override later)
  const DEFAULT_GRACE_DAYS = 7;

  const expiredSubs = await subscriptionModel.find({ status: 'EXPIRED' }).lean();
  for (const s of expiredSubs) {
    try {
      const companyGrace = s.graceDays || DEFAULT_GRACE_DAYS;
      if (!s.expiredAt) continue;
      const graceUntil = s.expiredAt + (companyGrace * 24 * 60 * 60 * 1000);
      if (now > graceUntil) continue; // beyond grace

      // Look for a paid order for this subscription or a new paid order for reactivation
      const paidOrder = await orderModel.findOne({ subscriptionId: s._id, status: 'paid' }).lean();
      if (paidOrder) {
        try {
          await CompanyService.activateSubscriptionIfEligible(paidOrder);
          await enqueueJob({ type: 'notify.company', payload: { companyId: s.companyId, type: 'SUBSCRIPTION_REACTIVATED', subscriptionId: s._id } });
        } catch (err) {
          console.error('Grace reactivation failed for', s._id, err);
        }
      }
    } catch (err) {
      console.error('Error in grace reactivation worker for sub', s._id, err);
    }
  }
};
