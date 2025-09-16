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
    ANALYTICS: "analytics.process_event"
  }
};
