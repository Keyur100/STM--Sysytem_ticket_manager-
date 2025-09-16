/* Reaper resets stale IN_PROGRESS jobs whose lockedAt is older than a threshold
   and marks workers as offline if no heartbeat.
*/
const loggerReaper = require('./logger');

async function reaperLoop({ staleLockMs = 5 * 60 * 1000, heartbeatStaleMs = 2 * 60 * 1000, interval = 60 * 1000 }){
  const JobModel = require('./models/job.model').Job;
  const WorkerModel = require('./models/worker.model').Worker;

  setInterval(async ()=>{
    try{
      const threshold = new Date(Date.now() - staleLockMs);
      const res = await JobModel.updateMany(
        { status: 'IN_PROGRESS', lockedAt: { $lte: threshold } },
        { $set: { status: 'PENDING', lockedBy: null, lockedAt: null }, $inc: { retries: 1 } }
      );
      // mark offline workers
      const workerThreshold = new Date(Date.now() - heartbeatStaleMs);
      await WorkerModel.updateMany({ lastHeartbeat: { $lte: workerThreshold } }, { $set: { status: 'OFFLINE' } });

      loggerReaper.info({ res }, 'Reaper run completed');
    }catch(err){ loggerReaper.error(err, 'Reaper error'); }
  }, interval);
}
module.exports.reaperLoop = reaperLoop;
