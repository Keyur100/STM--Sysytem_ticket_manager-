## Project Structure

### Frontend
```
frontend
├── .env
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── public
│   ├── vite.svg
├── README.md
├── src
│   ├── api
│   │   ├── axios.js
│   │   ├── endpoints.js
│   ├── App.jsx
│   ├── components
│   │   ├── common
│   │   │   ├── ImageUpload.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── modals
│   │   │   │   ├── AddNewModal.jsx
│   │   │   │   ├── AlertDialog.jsx
│   │   │   │   ├── ProfileModal.jsx
│   │   │   │   ├── ResetPasswordModal.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── PublicRoute.jsx
│   │   │   ├── SearchInput.jsx
│   │   │   ├── TableWrapper.jsx
│   ├── GlobalUi.jsx
│   ├── helpers
│   │   ├── hooks
│   │   │   ├── useDebounce.js
│   │   │   ├── usePermissions.js
│   │   ├── permissionList.js
│   ├── main.jsx
│   ├── pages
│   │   ├── analytics
│   │   │   ├── Analytics.jsx
│   │   ├── AppShell
│   │   │   ├── index.jsx
│   │   │   ├── SideBar.jsx
│   │   │   ├── TopBar.jsx
│   │   ├── audit
│   │   │   ├── AuditList.jsx
│   │   ├── Auth
│   │   │   ├── DepartmentSelction.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── departments
│   │   │   ├── DepartmentForm.jsx
│   │   │   ├── DepartmentsList.jsx
│   │   ├── roles
│   │   │   ├── PermissionMatrix.jsx
│   │   │   ├── RoleForm.jsx
│   │   │   ├── RolesList.jsx
│   │   ├── tags
│   │   │   ├── TagForm.jsx
│   │   │   ├── TagsList.jsx
│   │   ├── tickets
│   │   │   ├── TicketForm.jsx
│   │   │   ├── TicketReplies.jsx
│   │   │   ├── TicketsList.jsx
│   │   │   ├── TicketView.jsx
│   │   ├── users
│   │   │   ├── UserAddEdit
│   │   │   │   ├── MembershipList.jsx
│   │   │   │   ├── MembershipSelector.jsx
│   │   │   │   ├── UserForm.jsx
│   │   │   ├── UsersList.jsx
│   │   ├── workers
│   │   │   ├── Workers.jsx
│   ├── routesConfig.js
│   ├── store
│   │   ├── index.js
│   │   ├── slices
│   │   │   ├── authSlice.js
│   │   │   ├── uiSlice.js
│   ├── theme
│   │   ├── ThemeWrapper.jsx
├── vite.config.js
```

### Backend
```
backend
├── .env
├── .env.example
├── package-lock.json
├── package.json
├── pm2.worker.config.js
├── src
│   ├── constants
│   │   ├── index.js
│   │   ├── ticket.constant.js
│   ├── constantsJobs.js
│   ├── controllers
│   │   ├── analytics.controller.js
│   │   ├── audit.controller.js
│   │   ├── auth.controller.js
│   │   ├── department.controller.js
│   │   ├── reply.controller.js
│   │   ├── role.controller.js
│   │   ├── tag.controller.js
│   │   ├── ticket.controller.js
│   │   ├── user.controller.js
│   │   ├── worker.controller.js
│   ├── libs
│   │   ├── jobQueue.js
│   │   ├── logger.js
│   │   ├── rateLimiter.js
│   │   ├── reaper.js
│   │   ├── redisClient.js
│   ├── middlewares
│   │   ├── authJwt.js
│   │   ├── errorHandler.js
│   │   ├── rbac.js
│   │   ├── tryCatch.js
│   │   ├── validation.js
│   ├── models
│   │   ├── audit.model.js
│   │   ├── department.model.js
│   │   ├── job.model.js
│   │   ├── mongoose.js
│   │   ├── reply.model.js
│   │   ├── replyAttachment.model.js
│   │   ├── role.model.js
│   │   ├── summary.ticket_by_agent.model.js
│   │   ├── tag.model.js
│   │   ├── ticket.model.js
│   │   ├── ticketAssignment.model.js
│   │   ├── ticketRelationship.model.js
│   │   ├── user.model.js
│   │   ├── userMembership.model.js
│   │   ├── worker.model.js
│   ├── routes
│   │   ├── api.js
│   ├── seed
│   │   ├── initialData.js
│   ├── server.js
│   ├── services
│   │   ├── auth
│   │   │   ├── auth.helper.service.js
│   │   │   ├── auth.service.js
│   │   ├── ticket
│   │   │   ├── assign_reassign.service.js
│   │   │   ├── sla.service.js
│   ├── utils
│   │   ├── bcrypt.js
│   │   ├── pagination.js
│   │   ├── response.js
│   │   ├── token.service.js
│   ├── validators
│   │   ├── auth.login.js
│   │   ├── auth.register.js
│   │   ├── department.create.js
│   │   ├── department.update.js
│   │   ├── role.create.js
│   │   ├── role.update.js
│   │   ├── tag.create.js
│   │   ├── tag.update.js
│   │   ├── user.create.js
│   │   ├── yupSchemas.js
│   ├── workers
│   │   ├── assignmentWorker.js
│   │   ├── auditWorker.js
│   │   ├── autocloseWorker.js
│   │   ├── baseWorker.js
│   │   ├── escalationWorker.js
│   │   ├── notificationWorker.js
│   │   ├── replyWorker.js
```
