const ClientUserService = require('../services/clientUser.service');
const { sendSuccess, sendError } = require('../../utils/response');

async function listClientUsers(req, res) {
  try {
    const { all, page, limit, q, orderBy, order } = req.query;
    const companyId = req.params.companyId || null;

    const result = await ClientUserService.listClientUsers({ all: all === 'true' || all === true, companyId, page: page || 1, limit: limit || 25, q, orderBy, order });

    return sendSuccess(res, result, 'Client users fetched');
  } catch (err) {
    console.error('Error listing client users', err);
    return sendError(res, 500, err.message || 'Failed to fetch client users');
  }
}

async function getClientUser(req, res) {
  try {
    const { id } = req.params;
    const user = await ClientUserService.getClientUserById(id);
    if (!user) return sendError(res, 404, 'Client user not found');
    return sendSuccess(res, { clientUser: user }, 'Client user fetched');
  } catch (err) {
    console.error('Error fetching client user', err);
    return sendError(res, 500, err.message || 'Failed to fetch client user');
  }
}

async function updateClientUser(req, res) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const updatedBy = req.user?._id;

    const updated = await ClientUserService.updateClientUser(id, payload, updatedBy);
    if (!updated) return sendError(res, 404, 'Client user not found');

    return sendSuccess(res, { clientUser: updated }, 'Client user updated');
  } catch (err) {
    console.error('Error updating client user', err);
    return sendError(res, 500, err.message || 'Failed to update client user');
  }
}

module.exports = {
  listClientUsers,
  getClientUser,
  updateClientUser
};
