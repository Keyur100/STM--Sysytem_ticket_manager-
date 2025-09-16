const { Job } = require('../../models/job.model');
const { enqueueJob } = require('../../libs/jobQueue');

const SLA_MAP = { p1: 15, p2: 30, p3: 60 };

async function rescheduleSLA(ticket) {
  // Cancel any pending SLA jobs for this ticket
  await Job.updateMany(
    { type: 'ticket.escalate', 'payload.ticketId': ticket._id, status: 'PENDING' },
    { $set: { status: 'CANCELLED' } }
  );

  const slaMinutes = SLA_MAP[ticket.priority] || 60;

  // Schedule new SLA job
  await enqueueJob({
    type: 'ticket.escalate',
    payload: { ticketId: ticket._id },
    scheduledAt: Date.now() + slaMinutes * 60 * 1000

  });
}

module.exports = { rescheduleSLA };

