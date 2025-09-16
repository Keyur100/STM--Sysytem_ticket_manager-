const { Ticket } = require("../models/ticket.model");
const { Reply } = require("../models/reply.model");
const { enqueueJob } = require("../libs/jobQueue");
const { connectMongoose } = require("../models/mongoose");
const baseLoop = require("./baseWorker");
const {
  findEscalationTarget,
  recordAssignment,
  updateAgentSummaries,
} = require("../services/ticket/assign_reassign.service");
const { ASSIGNMENT_TYPE } = require("../constants/ticket.constant");

const ESCALATION_LEVELS = [
  { level: 1, role: "Manager" },
  { level: 2, role: "Admin" },
];

async function escalationProcessor(job) {
  const { ticketId } = job.payload || {};
  if (!ticketId) throw new Error("ticketId missing");

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error("Ticket not found");

  const currentLevel = ticket.escalationLevel || 0;
  if (currentLevel >= ESCALATION_LEVELS.length) {
    await enqueueJob({
      type: "audit.log_event",
      payload: {
        action: "ticket.escalation_limit_reached",
        entityType: "Ticket",
        entityId: ticketId,
      },
    });
    return { escalated: false, reason: "max_level_reached" };
  }

  const nextLevel = currentLevel + 1;
  const nextRole = ESCALATION_LEVELS[nextLevel - 1].role;

  // find target user via UserMembership
  const targetMembership = await findEscalationTarget(ticket.department, nextRole);
  const targetUserId = targetMembership?.userId?._id || null;

  const oldAgentId = ticket.assignedAgentId || null;

  // update ticket
  ticket.statusKey = "escalated";
  ticket.escalationLevel = nextLevel;
  if (targetUserId) ticket.assignedAgentId = targetUserId;
  ticket.lastActivityAt = new Date();
  await ticket.save();

  // record + update summaries
  await recordAssignment({
    ticketId,
    agentId: targetUserId,
    role: nextRole,
    assignedBy: "system:auto",
    assignmentType: ASSIGNMENT_TYPE.REASSIGN.ESCALATION,
  });

  await updateAgentSummaries({
    oldAgentId,
    newAgentId: targetUserId,
    priority: ticket.priority,
  });

  // reply log
  await Reply.create({
    ticketId,
    senderId: null,
    message: `Ticket escalated by system to level ${nextLevel} (${nextRole})`,
    type: "internal",
  });

  // notify
  await enqueueJob({
    type: "notification.send",
    payload: { ticketId, to: targetUserId || nextRole },
  });

  // audit
  await enqueueJob({
    type: "audit.log_event",
    payload: {
      action: "ticket.escalated",
      entityType: "Ticket",
      entityId: ticketId,
      details: { level: nextLevel, role: nextRole, targetUser: targetUserId },
    },
  });

  return { escalated: true, level: nextLevel, role: nextRole, targetUser: targetUserId };
}

if (require.main === module) {
  (async () => {
    await connectMongoose();
    baseLoop({
      workerId: "escalationWorker-1",
      jobTypes: ["ticket.escalate"],
      processFunc: escalationProcessor,
      pollInterval: 2000,
    });
  })();
}

module.exports.escalationProcessor = escalationProcessor;
