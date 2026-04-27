# SAAS Workers - PM2 Management Guide

## 📦 Quick Start

### Start All Workers
```bash
# Windows Command Prompt
cd support-backend
start-workers.bat start

# OR using PM2 directly
pm2 start pm2.worker.config.js

# OR PowerShell
.\manage-workers.ps1 start-all
```

### View Status
```bash
pm2 list
```

### View Logs
```bash
pm2 logs
```

### Stop All Workers
```bash
pm2 stop all
```

---

## 🎯 14 SAAS Workers Overview

| # | Worker Name | Purpose | Script Location |
|---|---|---|---|
| 1 | saas-subscription-expiry-worker | Checks & expires subscriptions | `src/saas/workers/subscription/subscriptionExpiryWorker.js` |
| 2 | saas-subscription-grace-reactivation-worker | Manages grace period logic | `src/saas/workers/subscription/subscriptionGraceReactivationWorker.js` |
| 3 | saas-subscription-reminder-worker | Sends expiry reminders | `src/saas/workers/subscription/subscriptionReminderWorker.js` |
| 4 | saas-addon-expiry-worker | Expires addons | `src/saas/workers/addonExpiry.worker.js` |
| 5 | saas-pending-addon-applier-worker | Applies pending addons | `src/saas/workers/pendingAddonApplier.worker.js` |
| 6 | saas-trial-expiry-worker | Expires trial periods | `src/saas/workers/trialExpiry.worker.js` |
| 7 | saas-billing-worker | Processes billing | `src/saas/workers/billing.worker.js` |
| 8 | saas-payment-reconciliation-worker | Reconciles payments | `src/saas/workers/paymentReconciliation.worker.js` |
| 9 | saas-proration-worker | Calculates proration | `src/saas/workers/proration.worker.js` |
| 10 | saas-usage-quota-enforcement-worker | Enforces usage quotas | `src/saas/workers/usageQuotaEnforcement.worker.js` |
| 11 | saas-wallet-deduction-worker | Processes wallet deductions | `src/saas/workers/walletDeduction.worker.js` |
| 12 | saas-notification-worker | Sends notifications | `src/saas/workers/notificationWorker.js` |
| 13 | saas-hard-delete-worker | Hard deletes expired data | `src/saas/workers/hardDeleteWorker.js` |
| 14 | saas-health-worker | Health checks & monitoring | `src/saas/workers/health.worker.js` |

---

## 🚀 Common Commands

### Start/Stop/Restart
```bash
# Start all
pm2 start pm2.worker.config.js

# Stop all
pm2 stop all

# Restart all
pm2 restart all

# Restart specific worker
pm2 restart saas-subscription-expiry-worker

# Delete all
pm2 delete all
```

### Monitoring
```bash
# Real-time monitoring
pm2 monit

# View all processes
pm2 list

# Detailed info for one worker
pm2 info saas-subscription-expiry-worker

# Show process status
pm2 show saas-subscription-expiry-worker
```

### Logs
```bash
# View all logs (Ctrl+C to exit)
pm2 logs

# View specific worker logs
pm2 logs saas-subscription-expiry-worker

# View last 100 lines
pm2 logs --lines 100

# Follow error logs
pm2 logs --err

# Flush all logs
pm2 flush
```

---

## 📊 Database - Current Subscription Data

### Subscription Status Values
- **ACTIVE** - Currently active subscription
- **EXPIRED** - Subscription has passed the end date
- **SUSPENDED** - Manually suspended by admin
- **GRACE** - In grace period (7 days default)

### Subscription Lifecycle States
- **ACTIVE** - Normal active status
- **GRACE** - In grace period, can be reactivated
- **EXPIRED** - Fully expired (past grace period)
- **SUSPENDED** - Manually suspended

### Key Fields
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,              // Link to company
  status: 'ACTIVE|EXPIRED|SUSPENDED|GRACE',
  lifecycle: 'ACTIVE|GRACE|EXPIRED|SUSPENDED',
  startAt: Date,                    // When subscription started
  endAt: Date,                      // When subscription ends
  graceDays: Number,                // Grace period in days (default: 7)
  graceStartAt: Date,               // When grace period started
  graceEndAt: Date,                 // When grace period ends
  planSnapshot: {
    name: String,
    durationDays: Number,
    priceInPaise: Number,
    modulePermissions: Array
  },
  addonSnapshot: Array,             // List of active addons
  previousSubscriptionId: ObjectId, // Previous subscription
  lastCheckedAt: Date,              // Last worker check time
}
```

### Database Queries

#### Get Status Summary
```javascript
db.subscriptions.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])
```

#### Get Active Subscriptions
```javascript
db.subscriptions.find({ status: 'ACTIVE' })
```

#### Get Grace Period Subscriptions
```javascript
db.subscriptions.find({ lifecycle: 'GRACE' })
```

#### Get Expired Subscriptions
```javascript
db.subscriptions.find({ status: 'EXPIRED' })
```

#### Get Expiring Soon (Next 7 Days)
```javascript
const now = Date.now();
const in7Days = now + (7 * 24 * 60 * 60 * 1000);
db.subscriptions.find({
  status: 'ACTIVE',
  endAt: { $gte: now, $lte: in7Days }
})
```

#### Get Company Subscription
```javascript
db.subscriptions.findOne({
  companyId: ObjectId('COMPANY_ID'),
  status: 'ACTIVE'
}).sort({ createdAt: -1 })
```

---

## 📁 File Structure

```
support-backend/
├── pm2.worker.config.js           ← PM2 Configuration (UPDATED)
├── start-workers.bat              ← Windows batch script
├── src/
│   └── saas/
│       └── workers/
│           ├── subscription/
│           │   ├── subscriptionExpiryWorker.js
│           │   ├── subscriptionGraceReactivationWorker.js
│           │   └── subscriptionReminderWorker.js
│           ├── addonExpiry.worker.js
│           ├── pendingAddonApplier.worker.js
│           ├── trialExpiry.worker.js
│           ├── billing.worker.js
│           ├── paymentReconciliation.worker.js
│           ├── proration.worker.js
│           ├── usageQuotaEnforcement.worker.js
│           ├── walletDeduction.worker.js
│           ├── notificationWorker.js
│           ├── hardDeleteWorker.js
│           ├── health.worker.js
│           └── bootstrap/
│               └── workerBootstrap.js
└── logs/
    ├── subscription-expiry-out.log
    ├── subscription-expiry-error.log
    ├── billing-out.log
    ├── billing-error.log
    └── ... (more log files)
```

---

## 🛠️ Helper Scripts

### PowerShell Scripts (for Windows)

#### manage-workers.ps1
Comprehensive worker management:
```powershell
.\manage-workers.ps1 start-all      # Start all workers
.\manage-workers.ps1 stop-all       # Stop all workers
.\manage-workers.ps1 restart-all    # Restart all workers
.\manage-workers.ps1 status         # Show status
.\manage-workers.ps1 logs           # View logs
.\manage-workers.ps1 monit          # Real-time monitor
.\manage-workers.ps1 info [name]    # Worker info
.\manage-workers.ps1 help           # Show help
```

#### check-subscription-status.ps1
Database query helper:
```powershell
.\check-subscription-status.ps1 help    # Show all queries
.\check-subscription-status.ps1 stats   # Show quick stats
.\check-subscription-status.ps1 expiry  # Show expiry info
```

### Batch Script (for Windows)

#### start-workers.bat
Simple batch script:
```batch
start-workers.bat start     # Start all workers
start-workers.bat stop      # Stop all workers
start-workers.bat restart   # Restart all workers
start-workers.bat status    # Show status
start-workers.bat logs      # View logs
start-workers.bat clean     # Delete all workers
start-workers.bat monit     # Real-time monitor
start-workers.bat help      # Show help
```

---

## 📈 Worker Execution Flow

### 1. Subscription Expiry Workflow
```
subscriptionExpiryWorker
├─ Find subscriptions where endAt <= now
├─ Move to GRACE lifecycle
├─ Set graceEndAt = endAt + (graceDays * 24h)
└─ Update lastCheckedAt
```

### 2. Grace Period Workflow
```
subscriptionGraceReactivationWorker
├─ Find subscriptions in GRACE lifecycle
├─ Check if now <= graceEndAt
├─ If yes: Keep in GRACE
└─ If no: Mark as EXPIRED
```

### 3. Notification Workflow
```
subscriptionReminderWorker
├─ Find subscriptions expiring soon
├─ Send reminder notifications
└─ Log reminder sent
```

### 4. Addon Expiry Workflow
```
addonExpiryWorker
├─ Find expired addons in subscriptions
├─ Remove from addonSnapshot
└─ Update subscription
```

### 5. Payment Processing Workflow
```
paymentReconciliationWorker
├─ Find subscriptions with pending payments
├─ Check payment status in payment records
├─ Update subscription status if needed
└─ Mark payments as reconciled
```

---

## ✅ Setup Checklist

- [x] PM2 configuration updated with all 14 workers
- [x] All worker scripts exist in correct locations
- [x] Logging configured for all workers
- [x] Environment variables set up
- [x] Database connectivity configured
- [x] Management scripts created
- [x] Documentation complete
- [x] Helper scripts available

---

## 🔍 Troubleshooting

### Workers Not Starting
```bash
# Check for errors
pm2 logs

# Verify script paths exist
pm2 list

# Kill and restart
pm2 kill
pm2 start pm2.worker.config.js
```

### High Memory Usage
```bash
# Monitor memory
pm2 monit

# Restart specific worker
pm2 restart saas-subscription-expiry-worker
```

### Check Logs
```bash
# View all logs
pm2 logs

# View specific worker
pm2 logs saas-subscription-expiry-worker

# View errors
pm2 logs --err
```

---

## 📞 Support

- **PM2 Docs**: https://pm2.keymetrics.io/
- **MongoDB Docs**: https://docs.mongodb.com/
- **Node.js Docs**: https://nodejs.org/

---

## 📝 Configuration Details

### PM2 Configuration (`pm2.worker.config.js`)
- All workers configured with proper error/output logging
- Environment variables set for each worker
- Log date format: `YYYY-MM-DD HH:mm:ss Z`
- Execution mode: `fork` (single instance per worker)
- Watch mode: disabled for production stability

### Log Files
- **Location**: `support-backend/logs/`
- **Format**: `[worker-name]-[out|error].log`
- **Size**: Auto-rotated by PM2
- **Content**: Timestamped logs with full context

---

**Status**: ✅ Ready for Production
**Last Updated**: April 24, 2026
**Version**: 1.0
