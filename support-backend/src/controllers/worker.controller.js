const Worker = require("../models/worker.model").Worker;
const Job = require("../models/job.model").Job;
const { sendSuccess, sendError } = require("../utils/response");
async function listWorkers(req, res) {
  try {
    const workers = await Worker.find({}).lean();
    return sendSuccess(res, workers);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}
async function workerHeartbeat(req, res) {
  try {
    const { workerId, capabilities } = req.body;
    await Worker.updateOne({ workerId }, { $set: { workerId, capabilities, lastHeartbeat: new Date(), status: "ONLINE" } }, { upsert: true });
    return sendSuccess(res, null, "Heartbeat registered");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}
async function listJobs(req, res) {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    const jobs = await Job.find(q).sort({ createdAt: -1 }).limit(100).lean();
    return sendSuccess(res, jobs);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}
module.exports = { listWorkers, workerHeartbeat, listJobs };
