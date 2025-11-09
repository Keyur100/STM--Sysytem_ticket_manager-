// src/saas/models/subscription.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { SubscriptionStatus, BillingCycle } = require('../constants/subscription.constant');
// Subscription module tracks a company’s current subscription.
const SubscriptionSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'Plan' },
  planSnapshot: { type: Schema.Types.Mixed },// in this i am storing plan data at the time of company creation user provided
  addonsSnapshot: [{ type: Schema.Types.Mixed }],
  billingCycle: { type: String, enum: ["ONETIME", "DAILY","TRIAL", "WEEKLY", "MONTHLY", "YEARLY"], default: BillingCycle.MONTHLY },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.ACTIVE },
  scheduledDowngradeTo: { type: Schema.Types.ObjectId, ref: 'Plan' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  paymentIds: [{ type: Schema.Types.ObjectId, ref: "Payment" }],

}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
