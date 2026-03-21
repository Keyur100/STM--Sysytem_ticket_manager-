const { sendSecureRequest } = require('../services/sync.service');
const { sendSuccess, sendError } = require('../../utils/response');

// Fetch tickets from remote Laravel API (encrypted request/response)
const fetchTickets = async (req, res) => {
  try {
    // Build payload expected by external support API
    // Accept filters via query string: priority, created_at_from, created_at_to, branch_id, company, createdby, status, page, limit, search
    const listUrl = process.env.SUPPORT_API_LIST_URL || 'http://testing.edobiz.in/api/v1/support/list';

    const payload = {
      priority: req.query.priority,
      created_at_from: req.query.created_at_from || req.query.created_from,
      created_at_to: req.query.created_at_to || req.query.created_to,
      branch_id: req.query.branch_id,
      company: req.query.company,
      createdby: req.query.createdby,
      status: req.query.status,
      page: req.query.page || req.query.p || 1,
      limit: req.query.limit || req.query.per_page || 10,
      search: req.query.search,
    };

    const resp = await sendSecureRequest(payload, listUrl);
    if (!resp || !resp.data) return sendError(res, 502, 'Invalid remote response');

    // If external API returns { status, message, data: [...] } forward it
    return sendSuccess(res, resp.data, 'Tickets fetched');
  } catch (err) {
    console.error('fetchTickets error', err.message || err, err.stack);
    return sendError(res, 500, err.message || 'Failed to fetch tickets');
  }
};

// Update ticket status on remote system
const updateTicketStatus = async (req, res) => {
  try {
    const updateUrl = process.env.SUPPORT_API_UPDATE_URL || 'http://testing.edobiz.in/api/v1/support/update';

    const ticketId = req.params.id || req.body.id;
    const { status, comments_reply } = req.body;
    if (typeof status === 'undefined' || status === null) return sendError(res, 400, 'status required');

    const payload = {
      id: ticketId,
      status,
      comments_reply: comments_reply || [],
    };

    const resp = await sendSecureRequest(payload, updateUrl);
    if (!resp || !resp.data) return sendError(res, 502, 'Invalid remote response');

    return sendSuccess(res, resp.data, 'Ticket updated');
  } catch (err) {
    console.error('updateTicketStatus error', err.message || err, err.stack);
    return sendError(res, 500, err.message || 'Failed to update ticket');
  }
};

module.exports = { fetchTickets, updateTicketStatus };
