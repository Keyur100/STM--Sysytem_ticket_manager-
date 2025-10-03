// src/saas/models/plan.model.js-omly for saas not for internal permission
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserPricingSchema = new Schema({
  max_employees: { type: Number, default: 0 },
  max_branch: { type: Number, default: 0 },
  max_customers: { type: Number, default: 0 },
  max_suppliers: { type: Number, default: 0 },
  max_reseller: { type: Number, default: 0 },
  storageMB: { type: Number, default: 150 * 1024 }
}, { _id: false });

const PlanSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  description: String,
  planGroup: { type: String, index: true },
  billingCycle: { type: String, enum: ["ONETIME", "DAILY","TRIAL", "WEEKLY", "MONTHLY", "YEARLY"], default: "MONTHLY" },
  name: { type: String, required: true, index: true },
  pricePaise: { type: Number, default: 0 },// similiar to planPricePaise of company 
  
  durationDays: { type: Number, default: null },  

  userPricing: UserPricingSchema, // similiar to maxProvision of company
  modulePermissions: [{ type: Schema.Types.Mixed, default: {} }], // similiar to effectivePermissions of company

  isSystem: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  isCustom: { type: Boolean, default: false  },
  isDefault: { type: Boolean, default: false  },


  hasTax: { type: Boolean, default: true },
  taxName: { type: String, default: "GST" },
  taxIncluded: { type: Boolean, default: true },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });


PlanSchema.index({ code: 1 });
module.exports = mongoose.model('Plan', PlanSchema);
