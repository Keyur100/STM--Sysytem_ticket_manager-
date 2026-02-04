module.exports = {
  JOB_STATUS: { PENDING: "PENDING", IN_PROGRESS: "IN_PROGRESS", DONE: "DONE", FAILED: "FAILED", RETRY: "RETRY", DLQ: "DLQ" },
  JOB_TYPES: {
    TICKET_CREATE: "ticket.create",
    TICKET_ASSIGN: "ticket.assignment",
    TICKET_REPLY: "ticket.reply",
    NOTIFICATION: "notification.send",
    ESCALATE: "ticket.escalate",
    AUTOCLOSE: "ticket.autoclose",
    MERGE: "ticket.merge",
    AUDIT: "audit.log_event",
    ANALYTICS: "analytics.process_event",
    // SAAS Subscription Job Types
    SUBSCRIPTION_EXPIRY_CHECK: "subscription.expiry_check",
    SUBSCRIPTION_GRACE_PERIOD: "subscription.grace_period_check",
    SUBSCRIPTION_USAGE_CHECK: "subscription.usage_check",
    SUBSCRIPTION_EXPIRY_REMINDER: "subscription.expiry_reminder",
    SUBSCRIPTION_ADDON_EXPIRY: "subscription.addon_expiry_check",
    SUBSCRIPTION_RENEWAL_CHECK: "subscription.renewal_check",
    SUBSCRIPTION_RENEWAL_REQUEST: "subscription.renewal_request",
    SUBSCRIPTION_COMPLIANCE_AUDIT: "subscription.compliance_audit",
    SUBSCRIPTION_SLA_CHECK: "subscription.sla_check",
    SUBSCRIPTION_ACCOUNT_SUSPENDED: "subscription.account_suspended",
    // Notification Job Types
    NOTIFICATION_USAGE_ALERT: "notification.usage_alert",
    NOTIFICATION_PLAN_EXPIRY_REMINDER: "notification.plan_expiry_reminder",
    NOTIFICATION_ADDON_EXPIRY_REMINDER: "notification.addon_expiry_reminder",
    NOTIFICATION_ADDON_EXPIRED: "notification.addon_expired",
    NOTIFICATION_COMPLIANCE_ALERT: "notification.compliance_alert"
  }
};
