// src/saas/models/addon.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AddonSchema = new Schema({
  value: { type: String, required: true, unique: true },
  name: { type: String, required: true },//TODO 5 qty
  description: String,
  // unit: { type: String, enum: ['USER','GB','TICKET','API_CALL','CUSTOM'], required: true },
  // provides: { type: Schema.Types.Mixed, default: {} }, // e.g. { max_employees: 10 }
  // durationDays: { type: Number, default: null }, // null => permanent
  //UPDATED
  pricePaise: { type: Number, required: true },
  hasTax: Boolean,
  // ADDED-V2
  taxIncluded: Boolean,
  taxName: String,
  isSystem: Boolean,

  // 
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' }
}, { timestamps: true });

module.exports = mongoose.model('Addon', AddonSchema);
