const baseLoop = require('./baseWorker');
const loggerW = require('../libs/logger');
const { Ticket } = require('../models/ticket.model');
const { TicketSummaryByAgent } = require('../models/summary.ticket_by_agent.model');
const { enqueueJob } = require('../libs/jobQueue');
const { connectMongoose } = require('../models/mongoose');

async function autocloseProcessor(job) {
  const payload = job.payload || {};
  const ticketId = payload.ticketId;
  if (!ticketId) throw new Error('ticketId missing');

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('Ticket not found');

  const now = new Date();
  const lastActivity = ticket.lastActivityAt || ticket.updatedAt || ticket.createdAt;

  let shouldClose = false;

  if (
    ['resolved', 'pending_customer'].includes(ticket.statusKey) &&
    now - lastActivity >= 5 * 24 * 60 * 60 * 1000
  )
    shouldClose = true;
  if (!shouldClose && now - lastActivity >= 30 * 24 * 60 * 60 * 1000)
    shouldClose = true;
  if (['duplicate', 'spam'].includes(ticket.statusKey)) shouldClose = true;

  if (shouldClose) {
    const before = ticket.toObject();
    ticket.statusKey = 'closed';
    ticket.lastActivityAt = new Date();
    await ticket.save();

    // Update Agent Summary
    if (ticket.assignedAgentId) {
      await TicketSummaryByAgent.findOneAndUpdate(
        { agentId: ticket.assignedAgentId },
        {
          $inc: {
            closedCount: 1,
            [`prioritySummary.${ticket.priority}`]: -1, // reduce from priority bucket
            openCount: -1,
          },
          $set: { lastAssignedAt: new Date() },
        },
        { upsert: true }
      );
    }

    // 🔥 Audit + Notification jobs
    await enqueueJob({
      type: 'audit.log_event',
      payload: {
        action: 'autoclosed',
        entityType: 'Ticket',
        entityId: ticket._id,
        before,
        after: ticket.toObject(),
      },
    });
    await enqueueJob({
      type: 'notification.send',
      payload: { ticketId: ticket._id, to: 'customer' },
    });

    return { closed: true };
  }
  return { closed: false };
}

// Run worker
if (require.main === module) {
  (async () => {
    await connectMongoose();
    baseLoop({
      workerId: 'autocloseWorker-1',
      jobTypes: ['ticket.autoclose'],
      processFunc: autocloseProcessor,
      pollInterval: 1000, // every 1 sec (adjust as needed)
    });
  })();
}
