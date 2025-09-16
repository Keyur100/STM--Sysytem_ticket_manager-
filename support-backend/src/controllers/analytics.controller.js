const { sendSuccess, sendError } = require("../utils/response");
const TicketSummary = require("../models/summary.ticket_by_agent.model").TicketSummaryByAgent;
async function getAgentSummary(req, res) {
  try {
    const summaries = await TicketSummary.find({}).lean();
    return sendSuccess(res, summaries);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}
module.exports = { getAgentSummary };
