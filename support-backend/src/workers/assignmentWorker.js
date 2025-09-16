const baseLoop = require('./baseWorker');
const { Ticket } = require('../models/ticket.model');
const { UserMembership } = require('../models/userMembership.model');
const { TicketSummaryByAgent } = require('../models/summary.ticket_by_agent.model');
const { enqueueJob } = require('../libs/jobQueue');
const { updateAgentSummaries, recordAssignment } = require('../services/ticket/assign_reassign.service');
const { ASSIGNMENT_TYPE } = require('../constants/ticket.constant');
const { rescheduleSLA } = require('../services/ticket/sla.service');

async function assignmentProcessor(job) {
  const payload = job.payload || {};
  const ticketId = payload.ticketId;
  if (!ticketId) throw new Error('ticketId missing');

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('Ticket not found');

  const memberships = await UserMembership.find({ departmentId: payload.departmentId }).lean();
  if (!memberships || memberships.length === 0) throw new Error('No agents in department');

  const agentIds = memberships.map(m => m.userId);

  const summaries = await TicketSummaryByAgent.find({ agentId: { $in: agentIds } })
    .sort({ openCount: 1 }).limit(1).lean();

  const selectedAgent = summaries.length ? summaries[0].agentId : agentIds[0];
  const oldAgentId = ticket.assignedAgentId || null;

  ticket.assignedAgentId = selectedAgent;
  ticket.statusKey = 'assigned';
  ticket.lastActivityAt = new Date();
  ticket.updatedBy=null, // system updated 
  await ticket.save();

  await recordAssignment({
    ticketId: ticket._id,
    agentId: selectedAgent,
    assignedBy: 'system:auto',
    assignmentType: oldAgentId ? ASSIGNMENT_TYPE.REASSIGN.AUTO : ASSIGNMENT_TYPE.AUTO,
  });

  await updateAgentSummaries({ oldAgentId, newAgentId: selectedAgent, priority: ticket.priority });

  await enqueueJob({ type: 'audit.log_event', payload: { action: 'assign', entityType: 'Ticket', entityId: ticket._id, before: { assignedAgentId: oldAgentId }, after: { assignedAgentId: selectedAgent }, assignedBy: 'system:auto' } });

  // Reschedule SLA
  await rescheduleSLA(ticket);

  return { assignedTo: selectedAgent };
}

// Worker runner
if (require.main === module) {
  const { connectMongoose } = require('../models/mongoose');
  (async () => {
    await connectMongoose();
    baseLoop({ workerId: 'assignmentWorker-1', jobTypes: ['ticket.assignment'], processFunc: assignmentProcessor, pollInterval: 1000 });
  })();
}

module.exports.assignmentProcessor = assignmentProcessor;
