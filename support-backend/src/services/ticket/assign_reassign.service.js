const { TicketSummaryByAgent } = require("../../models/summary.ticket_by_agent.model");
const { UserMembership } = require("../../models/userMembership.model");
const { TicketAssignment } = require("../../models/ticketAssignment.model");

/**
 * Update agent summaries on assignment/reassignment
 */
async function updateAgentSummaries({ oldAgentId, newAgentId, priority }) {
  // if first assignment (no old agent), don't decrement
  if (oldAgentId) {
    await TicketSummaryByAgent.updateOne(
      { agentId: oldAgentId },
      {
        $inc: {
          openCount: -1,
          [`prioritySummary.${priority}`]: -1,
          reassignCount: 1,
        },
      }
    );
  }

  if (newAgentId) {
    await TicketSummaryByAgent.updateOne(
      { agentId: newAgentId },
      {
        $inc: { openCount: 1, [`prioritySummary.${priority}`]: 1 },
        $set: { lastAssignedAt: new Date() },
      },
      { upsert: true }
    );
  }
}

/**
 * Find escalation target: department + role
 */
async function findEscalationTarget(departmentId, roleName) {
  // join UserMembership → UserAuth
  return await UserMembership.findOne({
    departmentId,
  })
    .populate({
      path: "roleId",
      match: { name: roleName }, // assumes Role model has "name" field
    })
    .populate("userId")
    .lean();
}

/**
 * Record ticket assignment
 */
async function recordAssignment({ ticketId, agentId, assignedBy, assignmentType }) {
  return TicketAssignment.create({
    ticketId,
    agentId,
    // assignedRole: role,
    assignedBy,
    assignmentType,
    assignedAt: new Date(),
  });
}

module.exports = {
  updateAgentSummaries,
  findEscalationTarget,
  recordAssignment,
};
