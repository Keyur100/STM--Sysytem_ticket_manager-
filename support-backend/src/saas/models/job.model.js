// src/saas/models/job.model.js
const { Schema, model } = require('mongoose');

const JobSchema = new Schema({
  type: String,
  payload: Schema.Types.Mixed,
  status: { type: String, default: 'PENDING' },
  priority: { type: Number, default: 0 },
  scheduledAt: { type: Number, default: Date.now },
  maxRetries: { type: Number, default: 5 },
  retries: { type: Number, default: 0 },
  lockedBy: { type: String, default: null },
  lockedAt: { type: Date },
  lastError: { type: String },
  result: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('SaasJob', JobSchema);
