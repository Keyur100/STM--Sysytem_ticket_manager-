module.exports = {
  ROLES: { ADMIN: "Admin", AGENT: "Agent", MANAGER: "Manager", BILLING: "BillingUser", NORMAL: "NormalUser", SUPERADMIN: "SuperAdmin" },
  PERMISSIONS: {
    TICKET_CREATE: "ticket.create",
    TICKET_READ: "ticket.read",
    TICKET_UPDATE: "ticket.update",
    TICKET_ASSIGN: "ticket.assign",
    TICKET_REPLY: "ticket.reply",
    TICKET_ESCALATE: "ticket.escalate",
    TICKET_MERGE: "ticket.merge",
    AUDIT_READ: "audit.read",
    ANALYTICS_READ: "analytics.read"
  },
  JOB_TYPES: require("./../constantsJobs") || {},
  STATUS_KEYS: { OPEN: "open", PENDING_CUSTOMER: "pending_customer", PENDING_AGENT: "pending_agent", RESOLVED: "resolved", CLOSED: "closed", ESCALATED: "escalated" },
  DEFAULTS: { PAGE_LIMIT: 20 }
};
