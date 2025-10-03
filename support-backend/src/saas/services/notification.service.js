// src/saas/services/notification.service.js
const { enqueueJob } = require('../libs/jobQueue');
const { JOB_TYPES } = require('../constants/job.constant');

class NotificationService {
  /**
   * Generic send to company email
   */
  static async sendEmailToCompany({ companyId, email, subject, body, meta = {} }) {
    await enqueueJob({
      type: JOB_TYPES.NOTIFICATION,
      payload: { channel: 'email', companyId, email, subject, body, meta },
      priority: 5
    });
  }

  static async sendLowQuotaAlert({ companyId, metric, percent }) {
    const subject = `Usage alert: ${metric} reached ${percent}%`;
    const body = `Your usage for ${metric} has reached ${percent}% of your quota. Consider upgrading or purchasing addons.`;
    await NotificationService.sendEmailToCompany({ companyId, email: null, subject, body, meta: { metric, percent } });
    await enqueueJob({ type: JOB_TYPES.AUDIT_LOG, payload: { action: 'notify.low_quota', companyId, metric, percent }, priority: 7 });
  }

  static async notifyAdminOfflinePayment({ paymentId, companyId }) {
    // admin notification job (worker will send to admins)
    await enqueueJob({ type: 'notification.admin_offline_payment', payload: { paymentId, companyId }, priority: 10 });
  }

  static async sendWelcome(companyId, email) {
    const subject = 'Welcome to the platform';
    const body = 'Thanks for signing up. Your trial / basic plan is active.';
    await NotificationService.sendEmailToCompany({ companyId, email, subject, body, meta: { welcome: true } });
  }

  // generic wrapper
  static async enqueueNotification(payload, priority = 5, scheduledAt = Date.now()) {
    await enqueueJob({ type: JOB_TYPES.NOTIFICATION, payload, priority, scheduledAt });
  }
}

module.exports = NotificationService;
