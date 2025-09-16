const loggerR = require('../libs/logger');

async function replyProcessor(job){
  const Reply = require('../models/reply.model.js').Reply;
  const Ticket = require('../models/ticket.model').Ticket;
  const { enqueueJob } = require('../libs/jobQueue');

  const payload = job.payload || {};
  const { ticketId, senderId, message, type = 'public' } = payload;
  if(!ticketId || !senderId) throw new Error('invalid payload');

  const reply = await Reply.create({ ticketId, senderId, message, type });
  await Ticket.findByIdAndUpdate(ticketId, { $set: { lastActivityAt: new Date() }, $inc: { repliesCount: 1 } });

  await enqueueJob({ type: 'notification.send', payload: { ticketId, replyId: reply._id, to: 'customer' } });
  await enqueueJob({ type: 'analytics.process_event', payload: { eventType: 'reply_created', ticketId, replyId: reply._id } });
  await enqueueJob({ type: 'audit.log_event', payload: { action: 'reply.create', actorId: senderId, entityType: 'Ticket', entityId: ticketId, after: reply } });
  return { replyId: reply._id };
}

if(require.main === module){
  const baseLoop = require('./baseWorker');
  const { connectMongoose } = require('../models/mongoose');
  (async ()=>{
    await connectMongoose();
    baseLoop({ workerId: 'replyWorker-1', jobTypes: ['ticket.reply'], processFunc: replyProcessor, pollInterval: 800 });
  })();
}
module.exports.replyProcessor = replyProcessor;
