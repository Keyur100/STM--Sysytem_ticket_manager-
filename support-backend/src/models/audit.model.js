const { Schema, model } = require("mongoose");

const AuditSchema = new Schema({
 entityType: { type: String, index: true },
  entityId: { type: Schema.Types.ObjectId, index: true },
  action: String,
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  data: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true }
});

// Index for faster query by entity
AuditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const Audit = model("Audit", AuditSchema);
module.exports = { Audit };
