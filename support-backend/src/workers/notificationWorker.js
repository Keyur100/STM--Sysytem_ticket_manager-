async function notificationProcessor(job) {
  const payload = job.payload || {};
  // TODO: integrate email/sms/push adapters
  console.log('NOTIFICATION', payload);
  return { sent: true };
}

if (require.main === module) {
  const baseLoop = require('./baseWorker');
  const { connectMongoose } = require('../models/mongoose');
  (async () => {
    await connectMongoose();
    baseLoop({
      workerId: 'notificationWorker-1',
      jobTypes: ['notification.send'],
      processFunc: notificationProcessor,
      pollInterval: 500,
    });
  })();
}

module.exports.notificationProcessor = notificationProcessor;
