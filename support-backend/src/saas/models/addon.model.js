// src/saas/models/addon.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AddonSchema = new Schema({
  value: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  
  // Addon type: 'limit' (adds numeric limits) or 'feature' (toggles features/permissions)
  type: { type: String, enum: ['limit', 'feature'], default: 'limit' },
  
  // Addon scope: 'global' (available to all) or 'company' (company-specific)
  scope: { type: String, enum: ['global', 'company'], default: 'global' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', sparse: true }, // if scope='company', link to company
  
  /**
   * Provides field structure:
   * For type='limit': { limits: { "max_employees": 10, "storage_mb": 1024 } }
   * For type='feature': { permissions: ["module.action.key1", "module.action.key2"] }
   */
  provides: { type: Schema.Types.Mixed, default: {} },
  
  // Billing: 'onetime' (one-time purchase) or 'recurring' (monthly/yearly)
  billingType: { type: String, enum: ['onetime', 'recurring'], default: 'onetime' },
  
  // For recurring addons, when do they expire?
  // 'duration': expires after durationDays
  // 'plan_end': expires when plan expires (aligns with subscription.endAt)
  // 'yearly': expires after 1 year from purchase
  expiryType: { type: String, enum: ['duration', 'plan_end', 'yearly'], default: 'duration' },
  durationDays: { type: Number, default: 30 }, // if expiryType='duration'
  
  // Pricing
  pricePaise: { type: Number, required: true },
  hasTax: Boolean,
  taxIncluded: Boolean,
  taxName: String,
  
  isSystem: Boolean,
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' }
}, { timestamps: true });

module.exports = mongoose.model('Addon', AddonSchema);
