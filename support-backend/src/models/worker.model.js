const { Schema, model } = require("mongoose");
const WorkerSchema = new Schema({
  workerId: { type: String, index: true, unique: true },
  capabilities: [String],
  lastHeartbeat: Date,
  status: String
});
const Worker = model("Worker", WorkerSchema);
module.exports = { Worker };
