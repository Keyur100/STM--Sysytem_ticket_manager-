const ClientUser = require('../models/clientUser.model');
const { enqueueJob } = require('../libs/jobQueue');

async function listClientUsers({ all = false, companyId = null, page = 1, limit = 25, q = '', orderBy = 'name', order = 'asc' } = {}) {
  const filter = {};
  if (!all && companyId) filter.companyId = companyId;

  if (q) {
    const re = new RegExp(q, 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [orderBy]: order === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    ClientUser.find(filter).populate('companyId', 'name').sort(sort).skip(skip).limit(Number(limit)).lean(),
    ClientUser.countDocuments(filter)
  ]);

    const clientUsers = items.map(({ companyId, ...rest }) => ({
    ...rest,
    companyName: companyId?.name || null,
    company: companyId?._id || null // optional fallback
  }));

  return { clientUsers, total, page: Number(page), limit: Number(limit) };
}

async function getClientUserById(id) {
  return ClientUser.findById(id).lean();
}

async function updateClientUser(id, payload, updatedBy) {
  const allowed = ['name', 'email', 'phone', 'branchId', 'status'];
  const upd = {};
  for (const k of allowed) if (payload[k] !== undefined) upd[k] = payload[k];

  const updated = await ClientUser.findByIdAndUpdate(id, { $set: upd }, { new: true }).lean();

  if (updated) {
    try {
      await enqueueJob({ type: 'audit.log_event', payload: { action: 'update_client_user', entityId: id, after: updated, updatedBy } });
    } catch (e) {}
  }

  return updated;
}

module.exports = {
  listClientUsers,
  getClientUserById,
  updateClientUser
};
