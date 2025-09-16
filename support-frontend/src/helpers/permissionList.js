export const superAdminPermissions = [
  "auth.register","auth.login","auth.refresh","auth.logout",
  "user.create","user.read","user.update","user.delete",
  "role.create","role.read","role.update","role.delete",
  "department.create","department.read","department.update","department.delete",
  "ticket.create","ticket.department_read","ticket.read","ticket.update","ticket.delete","ticket.assign","ticket.escalate","ticket.merge","ticket.child","ticket.status.change",
  "reply.create","reply.read","reply.update","reply.delete",
  "worker.register","worker.read","worker.update","worker.delete","worker.heartbeat","job.read","job.requeue",
  "audit.read","audit.export","analytics.read","analytics.export",
  "tag.create","tag.read","tag.update","tag.delete","status.create","status.read","status.update","status.delete","settings.read","settings.update","monitoring.read","monitoring.manage",
  "ticket.reopen","ticket.department_read","user.self_read","user.reset_password","user.self_update"
];
