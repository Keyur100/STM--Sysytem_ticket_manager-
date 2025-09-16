// redis enqueue
// const { getRedis } = require("./redisClient");
// const JOB_LIST_KEY = "jobs.list";

// async function enqueueJob(job) {
//   const r = getRedis();
//   const j = JSON.stringify({ ...job, id: Date.now() + "-" + Math.floor(Math.random() * 1000), createdAt: new Date() });
//   await r.lPush(JOB_LIST_KEY, j);
//   return j;
// }

// async function fetchJobs(limit = 50) {
//   const r = getRedis();
//   const items = await r.lRange(JOB_LIST_KEY, 0, limit - 1);
//   return items.map(i => JSON.parse(i));
// }

// module.exports = { enqueueJob, fetchJobs };

// db insert job
async function enqueueJob({ type, payload = {}, priority = 0, scheduledAt = Date.now(), maxRetries = 5 }){
  const JobModel = require('../models/job.model').Job;
  const job = await JobModel.create({ type, payload, priority, scheduledAt, maxRetries });
  return job;
}

async function pickAndLockJob(workerId, desiredType){
  const JobModel = require('../models/job.model').Job;
  const now = Date.now();
  const job = await JobModel.findOneAndUpdate(
    { status: 'PENDING', type: desiredType, scheduledAt: { $lte: now } },
    { $set: { status: 'IN_PROGRESS', lockedBy: workerId, lockedAt: now } },
    { sort: { priority: -1, createdAt: 1 }, returnDocument: 'after' }
  ).lean();
  return job;
}

async function completeJob(jobId, result){
  const JobModel = require('../models/job.model').Job;
  return JobModel.findByIdAndUpdate(jobId, { status: 'DONE', result, lockedBy: null, lockedAt: null }, { new: true });
}

async function failJob(jobId, error, retries, maxRetries){
  const JobModel = require('../models/job.model').Job;
  const updates = { lockedBy: null, lockedAt: null, lastError: String(error), retries };
  if(retries >= maxRetries) updates.status = 'DLQ'; else updates.status = 'RETRY';
  return JobModel.findByIdAndUpdate(jobId, updates, { new: true });
}

module.exports = { enqueueJob, pickAndLockJob, completeJob, failJob };

