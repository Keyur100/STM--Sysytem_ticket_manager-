const express = require("express");
const router = express.Router();
const tryCatch = require("../middlewares/tryCatch");
const authController = require("../controllers/auth.controller");
const ticketController = require("../controllers/ticket.controller");
const replyController = require("../controllers/reply.controller");
const userController = require("../controllers/user.controller");
const roleController = require("../controllers/role.controller");
const departmentController = require("../controllers/department.controller");
const tagController = require("../controllers/tag.controller");
const workerController = require("../controllers/worker.controller");
const auditController = require("../controllers/audit.controller");
const analyticsController = require("../controllers/analytics.controller");
const validation = require("../middlewares/validation");
const { ticketCreateSchema, ticketUpdateSchema, replyCreateSchema } = require("../validators/yupSchemas");
const authJwt = require("../middlewares/authJwt");
const rbac = require("../middlewares/rbac");

// Auth
router.post("/auth/register", validation(require("../validators/auth.register")), tryCatch(authController.register));
router.post("/auth/login", validation(require("../validators/auth.login")), tryCatch(authController.login));
router.post("/auth/refresh", tryCatch(authController.refreshToken));
router.post("/auth/logout", authJwt, tryCatch(authController.logout));
router.post("/auth/select-department", tryCatch(authController.selectDepartment));

// Users
router.post("/users", authJwt, rbac("user.create"), validation(require("../validators/user.create")), tryCatch(userController.createUser));
router.get("/users", authJwt, rbac("user.read"), tryCatch(userController.listUsers));
router.get("/users/:id", authJwt, rbac("user.read"), tryCatch(userController.getUser));
router.patch("/users/:id", authJwt, rbac("user.update"), tryCatch(userController.updateUser));
router.delete("/users/:id", authJwt, rbac("user.delete"), tryCatch(userController.deleteUser));
router.get("/ticket-assignable-users/:id", authJwt, rbac("user.read"), tryCatch(userController.getTicketAssignableDeptWiseMembers));
router.post("/user/reset-password", authJwt, rbac("user.reset_password"), userController.resetPassword);
router.get("/me/:id", authJwt, rbac("user.self_read"), userController.getUser);
router.patch("/me/:id", authJwt, rbac("user.self_update"), userController.selfUpdateUser);


// Roles CRUD
router.post("/roles", authJwt, rbac("role.create"), validation(require("../validators/role.create")), tryCatch(roleController.createRole));
router.get("/roles", authJwt, rbac("role.read"), tryCatch(roleController.listRoles));
router.patch("/roles/:id", authJwt, rbac("role.update"), validation(require("../validators/role.update")), tryCatch(roleController.updateRole));
router.delete("/roles/:id", authJwt, rbac("role.delete"), tryCatch(roleController.deleteRole));

// Departments CRUD
router.post("/departments", authJwt, rbac("department.create"), validation(require("../validators/department.create")), tryCatch(departmentController.createDepartment));
router.get("/departments", authJwt, rbac("department.read"), tryCatch(departmentController.listDepartments));
router.patch("/departments/:id", authJwt, rbac("department.update"), validation(require("../validators/department.update")), tryCatch(departmentController.updateDepartment));
router.delete("/departments/:id", authJwt, rbac("department.delete"), tryCatch(departmentController.deleteDepartment));

// Tags CRUD
router.post("/tags", authJwt, rbac("tag.create"), validation(require("../validators/tag.create")), tryCatch(tagController.createTag));
router.get("/tags", authJwt, rbac("tag.read"), tryCatch(tagController.listTags));
router.patch("/tags/:id", authJwt, rbac("tag.update"), validation(require("../validators/tag.update")), tryCatch(tagController.updateTag));
router.delete("/tags/:id", authJwt, rbac("tag.delete"), tryCatch(tagController.deleteTag));

// Tickets & Replies
router.post("/tickets", authJwt, validation(ticketCreateSchema), tryCatch(ticketController.createTicket));
router.get("/tickets", authJwt, tryCatch(require("../controllers/ticket.controller").listTickets));
router.get("/tickets/:id", authJwt, tryCatch(require("../controllers/ticket.controller").getTicketDetail));
router.patch("/tickets/:id", authJwt, validation(ticketUpdateSchema), tryCatch(require("../controllers/ticket.controller").updateTicket));
// router.post("/tickets/assign", authJwt, rbac("ticket.assign"), tryCatch(ticketController.assignTicket));
// router.post("/tickets/escalate", authJwt, rbac("ticket.escalate"), tryCatch(ticketController.escalateTicket));
// router.post("/tickets/child", authJwt, tryCatch(ticketController.createChildTicket));
// router.patch("/tickets/:id/status", authJwt, tryCatch(ticketController.changeStatus));
// TODO rbac and modifiy apis
router.post("/replies", authJwt, validation(replyCreateSchema), tryCatch(replyController.createReply));
router.get("/replies/:id", authJwt, tryCatch(replyController.getReplies));

// Worker & Jobs
router.get("/workers", authJwt, rbac("admin.read"), tryCatch(workerController.listWorkers));
router.post("/workers/heartbeat", tryCatch(workerController.workerHeartbeat));
router.get("/jobs", authJwt, rbac("admin.read"), tryCatch(workerController.listJobs));

// Audit
router.get("/audits", authJwt, rbac("audit.read"), tryCatch(auditController.listAudit));

// Analytics
router.get("/analytics/agents", authJwt, rbac("analytics.read"), tryCatch(analyticsController.getAgentSummary));

module.exports = router;
