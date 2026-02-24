const axios = require('axios');
const { encrypt, decrypt } = require('../utils/crypto');
const { sendSuccess, sendError } = require('../../utils/response');

// Fetch tickets from remote Laravel API (encrypted request/response)
const fetchTickets = async (req, res) => {
  try {
    const secret = process.env.SYNC_API_SECRET;
    const remoteUrl = process.env.SAAS_TICKETS_URL;
    if (!secret || !remoteUrl) return sendError(res, 500, 'Sync not configured');

    // Optionally accept query params and include in encrypted payload
    const payloadEnc = encrypt({ query: req.query || {} }, secret);

    const resp = await axios.post(`${remoteUrl}/tickets/list`, { payload: payloadEnc }, { timeout: 20000 });
    if (!resp.data || !resp.data.payload) return sendError(res, 502, 'Invalid remote response');

    const data = decrypt(resp.data.payload, secret);
    return sendSuccess(res, data, 'Tickets fetched');
  } catch (err) {
    console.error('fetchTickets error', err.message || err);
    return sendError(res, 500, err.message || 'Failed to fetch tickets');
  }
};

// Update ticket status on remote system
const updateTicketStatus = async (req, res) => {
  try {
    const secret = process.env.SYNC_API_SECRET;
    const remoteUrl = process.env.SAAS_TICKETS_URL;
    if (!secret || !remoteUrl) return sendError(res, 500, 'Sync not configured');

    const ticketId = req.params.id;
    const { status, priority } = req.body;
    if (!status) return sendError(res, 400, 'status required');

    const payloadEnc = encrypt({ ticketId, status, priority }, secret);

    const resp = await axios.post(`${remoteUrl}/tickets/update-status`, { payload: payloadEnc }, { timeout: 20000 });
    if (!resp.data || !resp.data.payload) return sendError(res, 502, 'Invalid remote response');

    const data = decrypt(resp.data.payload, secret);
    return sendSuccess(res, data, 'Ticket updated');
  } catch (err) {
    console.error('updateTicketStatus error', err.message || err);
    return sendError(res, 500, err.message || 'Failed to update ticket');
  }
};

module.exports = { fetchTickets, updateTicketStatus };
