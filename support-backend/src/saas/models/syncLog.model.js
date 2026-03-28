const mongoose = require('mongoose');
const { Schema } = mongoose;

const SyncLogSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  step: { type: String, required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  message: String,
  type: { type: String, enum: ['trial', 'actual'], default: 'trial' },
  remoteResponse: Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('SyncLog', SyncLogSchema);
