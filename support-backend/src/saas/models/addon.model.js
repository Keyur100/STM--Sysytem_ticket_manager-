// src/saas/models/addon.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AddonSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  unit: { type: String, enum: ['USER','GB','TICKET','API_CALL','CUSTOM'], required: true },
  pricePerUnitPaise: { type: Number, required: true },
  provides: { type: Schema.Types.Mixed, default: {} }, // e.g. { max_employees: 10 }
  durationDays: { type: Number, default: null }, // null => permanent
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Addon', AddonSchema);
