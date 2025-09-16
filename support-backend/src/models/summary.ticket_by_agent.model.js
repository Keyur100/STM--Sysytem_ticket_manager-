const { Schema, model } = require("mongoose");

const TicketSummaryByAgentSchema = new Schema({
  agentId: { type: Schema.Types.ObjectId, required: true, index: true },
  openCount: { type: Number, default: 0 },
  closedCount: { type: Number, default: 0 },
  reopenCount: { type: Number, default: 0 },
  
  prioritySummary: {
    p3: { type: Number, default: 0 },//p3-low
    p2: { type: Number, default: 0 },
    p1: { type: Number, default: 0 }
  },
  lastAssignedAt: Date,
});

const TicketSummaryByAgent = model("TicketSummaryByAgent", TicketSummaryByAgentSchema);
module.exports = { TicketSummaryByAgent };

TicketSummaryByAgentSchema.index({ lastAssignedAt: -1 });
