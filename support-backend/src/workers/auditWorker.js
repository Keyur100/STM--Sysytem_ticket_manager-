const baseLoop = require('./baseWorker');
const { Audit } = require('../models/audit.model');
const logger = require('../libs/logger');

async function auditProcessor(job) {
  const payload = job.payload || {};
  const { action, entityType, entityId, before, after, data } = payload;

  if (!action || !entityType || !entityId) {
    throw new Error('Missing required audit fields');
  }

  const auditDoc = {
    action,
    entityType,
    entityId,
    before: before || null,
    after: after || null,
    data: data || {},
    createdAt: new Date()
  };

  await Audit.create(auditDoc);

  return { success: true, auditId: auditDoc._id };
}

// Run worker
if (require.main === module) {
  const { connectMongoose } = require('../models/mongoose');
  (async () => {
    await connectMongoose();
    baseLoop({
      workerId: 'auditWorker-1',
      jobTypes: ['audit.log_event'],
      processFunc: auditProcessor,
      pollInterval: 1000
    });
  })();
}

module.exports.auditProcessor = auditProcessor;
