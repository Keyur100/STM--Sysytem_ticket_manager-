// src/saas/models/subscription.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  SubscriptionStatus,
  BillingCycle,
} = require("../constants/subscription.constant");
// Subscription module tracks a company’s current subscription.
const SubscriptionSchema = new Schema(
  {
  
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    planSnapshot: {
      planId: Schema.Types.ObjectId,
      code: String,
      name: String,
      billingCycle: String,
      durationDays: Number,
      pricePaise: Number,
      userPricing: Schema.Types.Mixed,
      modulePermissions: Schema.Types.Mixed,
      taxConfig: Schema.Types.Mixed,
    },

    addonSnapshot: [
      {
        addonId: Schema.Types.ObjectId,
        name: String,
        value: String,
        qty: { type: Number, default: 1 },
        pricePaise: Number,
      },
    ],
    startAt: { type: Number, required: true },
    endAt: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    // UPDATED
      companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    }, 
    // ADDED
    previousSubscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
    planPricePaise: Number,
    addonPricePaise: Number,
    totalContractValuePaise: Number,
    autoRenew: { type: Boolean, default: false },
    // ✅ FIXED: not required (we set later from order)
    actualPaidPaise: { type: Number, default: 0 },

    remainingValuePaise: { type: Number, default: 0 },

    // notification flags to avoid duplicate reminder sends
    notifications: { type: Schema.Types.Mixed, default: {} },

    activatedByOrderId: { type: Schema.Types.ObjectId, ref: "Order" },

    // Scheduled plan change (downgrade or change) to be applied at next billing
    scheduledChange: {
      effectiveAt: Number,
      requestedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
      createdAt: { type: Number, default: Date.now }
    },

    // NOT NEEDED
    // scheduledDowngradeTo: { type: Schema.Types.ObjectId, ref: 'Plan' },
    // paymentIds: [{ type: Schema.Types.ObjectId, ref: "Payment" }],
    // billingCycle: { type: String, enum: ["ONETIME", "DAILY","TRIAL", "WEEKLY", "MONTHLY", "YEARLY"], default: BillingCycle.MONTHLY },NOT NEEDED
  },
  { timestamps: true }
);

SubscriptionSchema.index({ companyId: 1, status: 1 });
SubscriptionSchema.index({ companyId: 1, endAt: 1 });
module.exports = mongoose.model("Subscription", SubscriptionSchema);
