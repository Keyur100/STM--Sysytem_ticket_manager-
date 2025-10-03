// src/saas/models/company.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    url: { type: String, index: true, sparse: true },
    panNo: { type: String, index: true, sparse: true },
    gstNo: { type: String, index: true, sparse: true },
    bankAccount: { accountNumber: String, ifsc: String, bankName: String },
    contact: {
      personName: String,
      email: { type: String, lowercase: true, index: true, sparse: true },
      phone: String,
      address: String,
    },
    tenantType: { type: String, enum: ["OWN", "RESELLER"], default: "OWN" },
    resellerId: { type: Schema.Types.ObjectId, ref: "Company", sparse: true },

    plan: { type: Schema.Types.Mixed },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },

    usage: {
      employees: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
      suppliers: { type: Number, default: 0 },
      branches: { type: Number, default: 0 },
      reseller: { type: Number, default: 0 },
      storageUsedMB: { type: Number, default: 0 },
    },

    billingType: {
      type: String,
      enum: ["PREPAID", "POSTPAID"],
      default: "PREPAID",
    }, // prepaid means automatically deduct from wallet/credit -post paid means order will create but u need to pay
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
    statusReason: { type: String },

    appliedAddons: [{ type: Schema.Types.Mixed }],
    pendingAddons: [{ type: Schema.Types.Mixed }],
    transactions: [{ type: Schema.Types.Mixed }],
    audit: [{ type: Schema.Types.Mixed }],

    wishlist: [{ type: Schema.Types.ObjectId, ref: "Wishlist" }],

    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanySchema.index({ name: 1, isDeleted: 1 });

module.exports = mongoose.model("Company", CompanySchema);
