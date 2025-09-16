const { Schema, model } = require("mongoose");
const JobSchema = new Schema({
  type: String,
  payload: Schema.Types.Mixed,
  status: { type: String, default: "PENDING" },
  scheduledAt:{ type: Number},// for auto close job purpose create time we store currentday+5 days 
  createdAt: { type: Date, default: Date.now }
});
const Job = model("Job", JobSchema);
module.exports = { Job };
