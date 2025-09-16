const { Schema, model } = require("mongoose");

const TicketSchema = new Schema({
  ticketNumber: { type: String, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "UserAuth", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "UserAuth", default:null },
  department: { type: Schema.Types.ObjectId, ref: "Department" },
  tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
  priority: { type: String, enum: ["p3", "p2", "p1"], default: "p3" },
  statusKey: {
    type: String,
    enum: [
      "new", "assigned", "pending_customer", "pending_agent", "resolved",
      "closed", "escalated", "on_hold", "duplicate", "spam", "reopened", "cancelled"
    ],
    default: "new"
  },
  assignedAgentId: { type: Schema.Types.ObjectId, ref: "UserAuth" },

  // New
  reopenCount: { type: Number, default: 0 },
  previousAgents: [{ type: Schema.Types.ObjectId, ref: "UserAuth" }],
 // Reply counts
  replyCount: { type: Number, default: 0 },
  agentReplyCount: { type: Number, default: 0 },
  customerReplyCount: { type: Number, default: 0 },
  
  mergeParentId: { type: Schema.Types.ObjectId, ref: "Ticket" },
  childCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastActivityAt: { type: Date, default: Date.now }
});

const Ticket = model("Ticket", TicketSchema);
module.exports = { Ticket };

TicketSchema.index({ statusKey: 1, priority: 1 });
// models/ticket.model.js
TicketSchema.index({ assignedAgentId: 1 });
TicketSchema.index({ previousAgents: 1 });
TicketSchema.index({ reopenCount: 1 });
