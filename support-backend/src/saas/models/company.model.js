// src/saas/models/company.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const CompanySchema = new Schema(
  {
    // name: { type: String, required: true, index: true },
    name: { type: String },//TODO
    url: { type: String, index: true, sparse: true },
    panNo: { type: String, index: true, sparse: true },
    gstNumber: { type: String, index: true, sparse: true },
    contact: {
      personName: String,
      email: { type: String, lowercase: true, index: true, sparse: true },//TODO
      phone: String,
      address: String,
    },
    activeSubscriptionId: {
      //UPDATED
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },
    subscriptionHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Subscription",
      },
    ],
    usage: Schema.Types.Mixed,//UPDATED
    
    status: {
      type: String,
      enum: ["draft", "active", "expired", "over_limit", "suspended"],
      default: "draft",
    },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    // tenantType: { type: String, enum: ["OWN", "RESELLER"], default: "OWN" },
    // resellerId: { type: Schema.Types.ObjectId, ref: "Company", sparse: true },
    // plan: { type: Schema.Types.Mixed },//NOT NEEDED

    // billingType: {//NOT NEEDED
    //   type: String,
    //   enum: ["PREPAID", "POSTPAID"],
    //   default: "PREPAID",
    // }, // prepaid means automatically deduct from wallet/credit -post paid means order will create but u need to pay
    // statusReason: { type: String },//NOT NEEDED

    // appliedAddons: [{ type: Schema.Types.Mixed }],NOT NEEDED
    // pendingAddons: [{ type: Schema.Types.Mixed }],NOT NEEDED
    // Transactions stored in separate Transaction model with $lookup
    // audit: [{ type: Schema.Types.Mixed }],NOT NEEDED

    // wishlist: [{ type: Schema.Types.ObjectId, ref: "Wishlist" }], NOT NEEDED

    // EXTRA V1
    logo: String,
    // Store the plan snapshot assigned to this company. This is a company-specific
    // copy of the plan (price, modulePermissions, enabled flags) and must be
    // used for billing/permission decisions instead of the canonical plan doc.
    planSnapshot: Schema.Types.Mixed,
  },
  { timestamps: true }
);

CompanySchema.index({ name: 1, isDeleted: 1 });

module.exports = mongoose.model("Company", CompanySchema);
