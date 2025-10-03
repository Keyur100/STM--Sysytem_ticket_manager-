// src/saas/services/audit.service.js
const Audit = require('../models/audit.model');
const { enqueueJob } = require('../libs/jobQueue');
const { JOB_TYPES } = require('../constants/job.constant');

/**
 * Lightweight audit service.
 * - Creates DB record for immediate local query (small store)
 * - Enqueues heavy processing (external logging, analytics) to background
 */
class AuditService {
  static async record({ entityType, entityId, action, before = null, after = null, data = null, createdBy = null }) {
    try {
      const rec = await Audit.create({
        entityType,
        entityId,
        action,
        before,
        after,
        data,
        createdAt: new Date()
      });

      // enqueue background audit processing for analytics/3rd party sinks
      await enqueueJob({
        type: JOB_TYPES.AUDIT_LOG,
        payload: { auditId: rec._id, entityType, entityId, action, createdBy },
        priority: 9
      });

      return rec;
    } catch (err) {
      // don't throw — audit failure shouldn't break main flow; but bubble if you want
      console.error('AuditService.record failed', err);
      throw err;
    }
  }

  static async list({ filter = {}, skip = 0, limit = 50, sort = { createdAt: -1 } } = {}) {
    const q = Audit.find(filter).sort(sort).skip(parseInt(skip)).limit(parseInt(limit));
    const data = await q.lean();
    const total = await Audit.countDocuments(filter);
    return { data, total, skip: parseInt(skip), limit: parseInt(limit) };
  }
}

module.exports = AuditService;
