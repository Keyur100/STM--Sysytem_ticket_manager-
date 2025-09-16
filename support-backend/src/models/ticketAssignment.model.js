const { Schema, model } = require("mongoose");

const TicketAssignmentSchema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
  agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  assignedBy: { type: Schema.Types.Mixed }, // userId or 'system:auto'
  assignedAt: { type: Date, default: Date.now },
  assignmentType: { type: String, enum: ['auto_first_time','manual_first_time','auto_reassign','manual_reassign','escalation_reassign'], default: 'auto' }
});

const TicketAssignment = model("TicketAssignment", TicketAssignmentSchema);
module.exports = { TicketAssignment };
