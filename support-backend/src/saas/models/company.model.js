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
    // Short code (unique/optional) for the company (e.g. tenant code)
    code: { type: String, index: true, sparse: true },
    // Store addons selected by the company as a lightweight map
    // e.g. { "extra_users": 2, "storage_mb": 5120 }
    selectedAddons: { type: Schema.Types.Mixed, default: {} },
    // Selected branches map and metadata
    selectedBranches: { type: Schema.Types.Mixed, default: {} },
    // Effective user limits computed from plan + active addons (e.g., { max_employees: 12, storageMB: 1024 })
    effectiveUserLimits: { type: Schema.Types.Mixed, default: {} },
    // Tax settings for company-level tax config
    taxSettings: {
      taxName: { type: String, default: 'GST' },
      percentage: { type: Number, default: 18 },
      taxIncluded: { type: Boolean, default: true },
    },
    // Generic settings holder: financial year, serial numbers, general settings
    // settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

CompanySchema.index({ name: 1, isDeleted: 1 });

module.exports = mongoose.model("Company", CompanySchema);

// [
// "companies",
// "orders",
// "subscriptions",
// "wallets",
// "wallettransactions",
// "payments",
// "audittrails",
// "branches",
// "clientusers",
// "synclogs",
// "transactions"
// ].forEach(c => db[c].deleteMany({}))
