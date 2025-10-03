// src/saas/models/usageRecord.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UsageRecordSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', index: true },
  addon: { type: Schema.Types.ObjectId, ref: 'Addon', index: true },
  metric: { type: String, enum: ['USER','GB','TICKET','API_CALL','CUSTOM'], required: true },
  quantity: { type: Number, required: true },
  recordedAt: { type: Date, default: Date.now, index: true },
  meta: { type: Schema.Types.Mixed },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

UsageRecordSchema.index({ company: 1, metric: 1, recordedAt: -1 });

module.exports = mongoose.model('UsageRecord', UsageRecordSchema);
