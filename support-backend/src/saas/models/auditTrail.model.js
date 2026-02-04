const mongoose = require('mongoose');
const { Schema } = mongoose;

/* =========================
  AUDIT TRAIL remain
========================= */

const AuditTrailSchema = new Schema({
  companyId: Schema.Types.ObjectId,
  action: String,
  performedBy: Schema.Types.ObjectId,
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  metadata: Schema.Types.Mixed
}, { timestamps: true });
module.exports = mongoose.model('AuditTrail', AuditTrailSchema);