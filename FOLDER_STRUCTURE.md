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
│   │   ├── saas
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
│   │   ├── saas
│   │   │   ├── billing
│   │   │   ├── company
│   │   │   ├── resource
│   │   │   ├── subscription
│   │   │   ├── wallet
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
│   │   ├── saas
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
│   │   │   ├── saas
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
│   │   ├── saas
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
│   │   ├── saas
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
│   │   ├── saas
│   ├── saas
│   │   ├── constants
│   │   │   ├── addon.constant.js
│   │   │   ├── billing.constant.js
│   │   │   ├── coupon.constant.js
│   │   │   ├── job.constant.js
│   │   │   ├── order.constant.js
│   │   │   ├── payment.constant.js
│   │   │   ├── plan.constant.js
│   │   │   ├── saas.constant.js
│   │   │   ├── subscription.constant.js
│   │   │   ├── wallet.constant.js
│   │   ├── controllers
│   │   │   ├── addon.controller.js
│   │   │   ├── billing.controller.js
│   │   │   ├── cart.controller.js
│   │   │   ├── company.controller.js
│   │   │   ├── coupon.controller.js
│   │   │   ├── order.controller.js
│   │   │   ├── payment.controller.js
│   │   │   ├── resource.controller.js
│   │   │   ├── subscription.controller.js
│   │   │   ├── usage.controller.js
│   │   │   ├── wallet.controller.js
│   │   ├── helpers
│   │   │   ├── db.helper.js
│   │   │   ├── logger.helper.js
│   │   │   ├── response.helper.js
│   │   │   ├── validation.helper.js
│   │   ├── libs
│   │   │   ├── jobQueue.js
│   │   │   ├── prorationHelper.js
│   │   ├── models
│   │   │   ├── addon.model.js
│   │   │   ├── cart.model.js
│   │   │   ├── company.model.js
│   │   │   ├── coupon.model.js
│   │   │   ├── invoice.model.js
│   │   │   ├── job.model.js
│   │   │   ├── module.model.js
│   │   │   ├── order.model.js
│   │   │   ├── payment.model.js
│   │   │   ├── plan.model.js
│   │   │   ├── refund.model.js
│   │   │   ├── subscription.model.js
│   │   │   ├── usageRecord.model.js
│   │   │   ├── wallet.model.js
│   │   │   ├── whishlist.model.js
│   │   ├── routes
│   │   │   ├── addon.route.js
│   │   │   ├── admin.route.js
│   │   │   ├── billing.route.js
│   │   │   ├── company.route.js
│   │   │   ├── coupon.route.js
│   │   │   ├── index.js
│   │   │   ├── order.route.js
│   │   │   ├── payment.route.js
│   │   │   ├── resource.route.js
│   │   │   ├── subscription.route.js
│   │   │   ├── usage.route.js
│   │   │   ├── wallet.route.js
│   │   ├── seed
│   │   │   ├── data
│   │   │   │   ├── modules.data.js
│   │   │   │   ├── plans.data.js
│   │   │   ├── index.js
│   │   ├── services
│   │   │   ├── addon.service.js
│   │   │   ├── audit.service.js
│   │   │   ├── billing.service.js
│   │   │   ├── company.service.js
│   │   │   ├── coupon.service.js
│   │   │   ├── notification.service.js
│   │   │   ├── order.service.js
│   │   │   ├── payment.service.js
│   │   │   ├── subscription.service.js
│   │   │   ├── usage.service.js
│   │   │   ├── wallet.service.js
│   │   ├── utils
│   │   │   ├── date.util.js
│   │   ├── validators
│   │   │   ├── addon.buy.js
│   │   │   ├── admin.validator.js
│   │   │   ├── billing.validator.js
│   │   │   ├── company.create.js
│   │   │   ├── coupon.validator.js
│   │   │   ├── order.validator.js
│   │   │   ├── payment.validator.js
│   │   │   ├── resource.validator.js
│   │   │   ├── subscription.buy.js
│   │   │   ├── usage.validator.js
│   │   │   ├── wallet.topup.js
│   │   ├── workers
│   │   │   ├── addonExpiry.worker.js
│   │   │   ├── baseWorker.js
│   │   │   ├── billing.worker.js
│   │   │   ├── health.worker.js
│   │   │   ├── notificationWorker.js
│   │   │   ├── paymentReconciliation.worker.js
│   │   │   ├── pendingAddonApplier.worker.js
│   │   │   ├── proration.worker.js
│   │   │   ├── subscriptionExpiry.worker.js
│   │   │   ├── trialExpiry.worker.js
│   │   │   ├── usageQuotaEnforcement.worker.js
│   │   │   ├── walletDeduction.worker.js
│   ├── seed
│   │   ├── initialData.js
│   ├── server.js
│   ├── services
│   │   ├── auth
│   │   │   ├── auth.helper.service.js
│   │   │   ├── auth.service.js
│   │   ├── saas
│   │   │   ├── helper
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
│   │   ├── saas
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
│   │   ├── saas
```
