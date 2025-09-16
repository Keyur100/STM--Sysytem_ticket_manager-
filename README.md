# Support System with Scheduler Workers & RBAC

A scalable ticket management system built with **Node.js (backend)** and **Vite/React (frontend)**. The system includes a **role-based access control (RBAC)** system, a **scheduler worker system** for handling high traffic, and automated ticket assignment, escalation, and auto-close logic.

---
## Add .env in FRONTEND
VITE_API_URL=http://localhost:3100/api
## Add .env in BACKEND
MONGO_URI=mongodb://localhost:27017/support_ticket
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SUPERADMIN_EMAIL=superadmin@example.com
SUPERADMIN_PASS=SuperSecret1!
PORT=3100
LOG_LEVEL=info
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
BCRYPT_SALT_ROUNDS=10


## Features

- **RBAC System**:
  - 3 types of users:
    1. **Normal User (NU)** â€“ self-registered.
    2. **Sub User (SU)** â€“ created by SuperAdmin.
    3. **SuperAdmin (SA)** â€“ full access.
  - Roles have granular permissions (\user.self_update\, \	icket.create\, \	icket.assign\, etc.).
  - Department and tag access controlled via permissions.

- **Scheduler Worker System**:
  - Handles high traffic efficiently.
  - Multiple workers handle:
    - Ticket assignment
    - Replies
    - Escalation
    - Auto-close
    - Notifications
  - PM2 manages all workers.

- **Ticket System**:
  - Automatic and manual ticket assignment.
  - Escalation rules based on SLA.
  - Auto-close for resolved/expired tickets.
  - Reply system for agents.

- **Frontend Features**:
  - Dashboard & ticket listing.
  - Search, pagination, and priority tagging.
  - Profile view, update, and password reset (based on permissions).
  - Theme toggle (light/dark).
  - Role-based UI elements.

---

## Installation & Setup

1. **Clone the repository**:

\\\ash
git clone <repo_url>
cd <repo_folder>
\\\

2. **Install dependencies**:

**Backend:**

\\\ash
cd backend
npm install
make .env take refrence from .envconstant
redis service is enabled
\\\

**Frontend:**

\\\ash
cd frontend
npm install
\\\

3. **Create \.env\ file**:

\\\env
MONGO_URI=mongodb://localhost:27017/support_system
SUPERADMIN_EMAIL=superadmin@example.com
SUPERADMIN_PASS=SuperSecret1!
PORT=5000
\\\

4. **Seed initial data**:

\\\ash
cd backend
npm run seed
\\\

- Creates **roles**, **departments**, **tags**, and a **superadmin** user.

---

## Running the Project

### Backend

Start server:

\\\ash
npm run start
\\\

Start all workers (via PM2):

\\\ash
npm run start:workers
\\\

### Frontend

Start dev server:

\\\ash
npm run dev
\\\

---

## RBAC Overview

- **SuperAdmin (SA)** â€“ Full access (\*\).
- **Admin** â€“ Full system access.
- **Agent** â€“ Can read tickets, reply, assign, update.
- **Manager** â€“ Ticket read, update, assign, escalate.
- **NormalUser (NU)** â€“ Self registration, create tickets, read own tickets, reopen tickets.

**Permissions Examples**:

\\\	ext
"user.self_update"     // Update own profile
"user.reset_password"  // Reset own password
"user.self_read"       // View own profile
"ticket.create"        // Create ticket
"ticket.read"          // Read ticket
"ticket.assign"        // Assign ticket
"ticket.reply"         // Reply to ticket
"ticket.update"        // Update ticket
"ticket.reopen"        // Reopen closed ticket
\\\

---

## Worker System

- **Assignment Worker** â€“ Auto assign tickets to available agents.
- **Reply Worker** â€“ Send notifications for new replies.
- **Escalation Worker** â€“ Escalate tickets based on rules/SLA.
- **Auto-close Worker** â€“ Close tickets after inactivity/resolution.
- **Notification Worker** â€“ Notify users via email/notifications.

**PM2 Config Example**:

\\\js
module.exports = {
  apps: [
    { name: "assignmentWorker", script: "./src/workers/assignmentWorker.js" },
    { name: "replyWorker", script: "./src/workers/replyWorker.js" },
    { name: "escalationWorker", script: "./src/workers/escalationWorker.js" },
    { name: "autocloseWorker", script: "./src/workers/autocloseWorker.js" },
    { name: "notificationWorker", script: "./src/workers/notificationWorker.js" },
  ],
};
\\\

---

## Notes

- Normal users self-register.
- Sub-users are created by SuperAdmin.
- SuperAdmin sees all tickets across departments.
- Frontend UI is permission-driven.
