// /* REDIS 
//  Worker runner: polls Redis list and dispatches to workers.
//  Run with: npm run workerrun
// */
// const { getRedis } = require("../libs/redisClient");
// const ticketWorker = require("./ticketWorker");
// const notificationWorker = require("./notificationWorker");
// const logger = require("../libs/logger");

// async function run() {
//   const r = getRedis();
//   logger.info("Worker runner started. Polling jobs...");
//   while (true) {
//     try {
//       // BRPOP with timeout to block/pop from the jobs list (use lPop for simplicity)
//       const raw = await r.rPop("jobs.list"); // returns string or null
//       if (!raw) {
//         // no job, sleep a little
//         await new Promise((res) => setTimeout(res, 500));
//         continue;
//       }
//       const job = JSON.parse(raw);
//       logger.info("Dequeued job", job.type);
//       // Dispatch by type prefix
//       if (job.type && job.type.startsWith("ticket.")) {
//         await ticketWorker.processJob(job);
//       } else if (job.type && job.type.startsWith("notification.")) {
//         await notificationWorker.processJob(job);
//       } else {
//         logger.info("Unknown job type", job.type);
//       }
//     } catch (err) {
//       logger.error("Worker runner error", err);
//       await new Promise((res) => setTimeout(res, 1000));
//     }
//   }
// }

// run().catch((err) => {
//   console.error("Worker runner crashed", err);
//   process.exit(1);
// });

/*
Base worker shows the pick-lock-run pattern.
Each worker file should import this and provide processor functions.
*/
const { pickAndLockJob, completeJob, failJob } = require('../libs/jobQueue');
const loggerBase = require('../libs/logger');

async function baseWorkerLoop({ workerId, jobTypes, processFunc, pollInterval = 1000, workerModel }){
  const WorkerModel = require('../models/worker.model').Worker;
  loggerBase.info({ workerId, jobTypes }, 'Worker starting');
  await WorkerModel.updateOne({ workerId }, { $set: { workerId, lastHeartbeat: new Date(), status: 'ONLINE' } }, { upsert: true });

  setInterval(async () => {
    try{
      // heartbeat
      await WorkerModel.updateOne({ workerId }, { $set: { lastHeartbeat: new Date(), status: 'ONLINE' } }, { upsert: true });
      for(const t of jobTypes){
        const job = await pickAndLockJob(workerId,t)
        if(!job) continue;
        try{
          loggerBase.info({ jobId: job._id, type: job.type }, 'Processing job');
          const res = await processFunc(job);
          await completeJob(job._id,res)
        }catch(err){
          loggerBase.error({ err: err.message, jobId: job._id }, 'Job failed');
          await failJob(job._id,err.message,retries,job.maxRetries)
        }
      }
    }catch(err){
      loggerBase.error(err, 'Worker loop error');
    }
  }, pollInterval);
}
module.exports = baseWorkerLoop;
