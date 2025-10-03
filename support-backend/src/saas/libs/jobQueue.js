// jobQueue.js
const  Job  = require('../models/job.model');

/**
 * enqueueJob({ type, payload, priority = 0, scheduledAt = Date.now(), maxRetries = 5 })
 */
async function enqueueJob({ type, payload = {}, priority = 0, scheduledAt = Date.now(), maxRetries = 5 }) {
  const job = await Job.create({ type, payload, priority, scheduledAt, maxRetries });
  return job;
}

/**
 * pickAndLockJob(workerId, desiredType)
 */
async function pickAndLockJob(workerId, desiredType) {
  const now = Date.now();
  const job = await Job.findOneAndUpdate(
    {
      status: { $in: ['PENDING','RETRY'] },
      type: desiredType,
      scheduledAt: { $lte: now }
    },
    { $set: { status: 'IN_PROGRESS', lockedBy: workerId, lockedAt: now } },
    { sort: { priority: -1, createdAt: 1 }, returnDocument: 'after' }
  ).lean();
  return job;
}

/**
 * completeJob(jobId, result)
 */
async function completeJob(jobId, result = {}) {
  return Job.findByIdAndUpdate(jobId, { $set: { status: 'DONE', result, lockedBy: null, lockedAt: null } }, { new: true });
}

/**
 * failJob(jobId, error, retries, maxRetries)
 */
async function failJob(jobId, error, retries, maxRetries) {
  const backoffMs = Math.min(24 * 3600 * 1000, Math.pow(2, retries) * 60 * 1000); // 1min -> doubling -> max 24h
  const nextScheduledAt = Date.now() + backoffMs;
  const updates = {
    lockedBy: null,
    lockedAt: null,
    lastError: typeof error === 'string' ? error : (error && error.message) || String(error),
    retries
  };
  if (retries >= maxRetries) {
    updates.status = 'DLQ';
  } else {
    updates.status = 'RETRY';
    updates.scheduledAt = nextScheduledAt;
  }
  return Job.findByIdAndUpdate(jobId, updates, { new: true });
}

module.exports = { enqueueJob, pickAndLockJob, completeJob, failJob };
