const { Audit } = require('../models/audit.model');
const { sendSuccess, sendError } = require('../utils/response');

async function listAudit(req, res) {
  try {
    const { entityType, entityId, page = 1, limit = 50, from, to, search } = req.query;

    const query = {};

    // Entity filters
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;

    // Date range filter
    const now = new Date();
    const startDate = from ? new Date(from) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days default
    const endDate = to ? new Date(to) : now;
    query.createdAt = { $gte: startDate, $lte: endDate };

    // Search filter (keyword in action or data)
    if (search) {
      const regex = new RegExp(search, 'i'); // case-insensitive
      query.$or = [
        { action: regex },
        { 'data': regex } // for simple data search (string fields)
      ];
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const audits = await Audit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const totalCount = await Audit.countDocuments(query);
    const totalPages = Math.ceil(totalCount / Number(limit));

    return sendSuccess(res, {
      audits,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        totalCount
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

module.exports = { listAudit };
