const { pickAndLockJob, completeJob, failJob } = require("../libs/jobQueue");
const logger = require("../libs/logger");

async function baseWorker({ workerId, jobTypes, processFunc, pollInterval = 1000, WorkerModel }) {
  // Register worker heartbeat
  await WorkerModel.updateOne(
    { workerId },
    { $set: { workerId, lastHeartbeat: new Date(), status: "ONLINE" } },
    { upsert: true }
  );
  logger.info({ workerId, jobTypes }, "Worker started");

  setInterval(async () => {
    try {
      // Heartbeat update
      await WorkerModel.updateOne(
        { workerId },
        { $set: { lastHeartbeat: new Date(), status: "ONLINE" } },
        { upsert: true }
      );

      for (const type of jobTypes) {
        const job = await pickAndLockJob(workerId, type);
        if (!job) continue;

        try {
          logger.info({ jobId: job._id, type: job.type }, "Processing job");
          const result = await processFunc(job);
          await completeJob(job._id, result);
        } catch (err) {
          logger.error({ err: err.message, jobId: job._id }, "Job failed");
          await failJob(job._id, err.message, (job.retries || 0) + 1, job.maxRetries);
        }
      }
    } catch (err) {
      logger.error(err, "Worker loop error");
    }
  }, pollInterval);
}

module.exports = baseWorker;
