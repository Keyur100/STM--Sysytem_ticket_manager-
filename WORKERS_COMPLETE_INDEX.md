# SAAS Workers PM2 Setup - Complete Index

> **Status**: ✅ Complete and Ready for Production
> **Last Updated**: April 24, 2026

---

## 📋 Documentation Files Created

### 1. **WORKERS_SETUP_SUMMARY.md** (ROOT)
   - Overview of all changes
   - All 14 workers listed
   - Database structure explained
   - Quick start guide

### 2. **WORKERS_PM2_GUIDE.md** (ROOT)
   - Comprehensive PM2 guide
   - All available workers with descriptions
   - Quick start commands
   - Advanced commands
   - Database queries and operations
   - Troubleshooting guide

### 3. **WORKERS_QUICK_START.md** (ROOT)
   - Quick reference for common tasks
   - Worker list in table format
   - Useful command examples
   - Current subscription data queries
   - One-liner commands

### 4. **support-backend/WORKERS_README.md**
   - PM2 management guide
   - All 14 workers with descriptions
   - Common commands
   - Database queries
   - Helper scripts guide
   - Troubleshooting

### 5. **manage-workers.ps1** (ROOT)
   - PowerShell management script
   - Commands: start-all, stop-all, restart-all, logs, monit, info, flush
   - Color-coded output
   - Interactive prompts

### 6. **check-subscription-status.ps1** (ROOT)
   - Database query helper
   - 12 different query templates
   - Subscription data structure examples
   - Status and lifecycle value explanations

### 7. **support-backend/start-workers.bat**
   - Windows batch script
   - Commands: start, stop, restart, status, logs, monit, clean, help
   - Interactive menu

---

## 🔧 Configuration Files Updated

### pm2.worker.config.js (support-backend/)
```javascript
✅ 14 workers configured
✅ Proper logging for all workers
✅ Error file: logs/[worker]-error.log
✅ Output file: logs/[worker]-out.log
✅ Date format: YYYY-MM-DD HH:mm:ss Z
✅ Environment variables set
✅ Single instance per worker (fork mode)
```

---

## 🎯 All 14 Workers Configured

### Category: Subscription Management (3)
1. **saas-subscription-expiry-worker**
   - Handles subscription expiration
   - Moves expired subscriptions to GRACE lifecycle
   - Location: `src/saas/workers/subscription/subscriptionExpiryWorker.js`

2. **saas-subscription-grace-reactivation-worker**
   - Manages grace period logic
   - Checks if subscriptions should move to EXPIRED
   - Location: `src/saas/workers/subscription/subscriptionGraceReactivationWorker.js`

3. **saas-subscription-reminder-worker**
   - Sends expiry reminders
   - Notifies companies before expiry
   - Location: `src/saas/workers/subscription/subscriptionReminderWorker.js`

### Category: Addon Management (2)
4. **saas-addon-expiry-worker**
   - Handles addon expiration
   - Removes expired addons from subscriptions
   - Location: `src/saas/workers/addonExpiry.worker.js`

5. **saas-pending-addon-applier-worker**
   - Applies pending addons
   - Adds purchased addons to active subscriptions
   - Location: `src/saas/workers/pendingAddonApplier.worker.js`

### Category: Trial Management (1)
6. **saas-trial-expiry-worker**
   - Manages trial period expiration
   - Transitions trials to expired status
   - Location: `src/saas/workers/trialExpiry.worker.js`

### Category: Billing & Payment (3)
7. **saas-billing-worker**
   - Processes billing operations
   - Generates invoices
   - Location: `src/saas/workers/billing.worker.js`

8. **saas-payment-reconciliation-worker**
   - Reconciles payments
   - Updates subscription status based on payments
   - Location: `src/saas/workers/paymentReconciliation.worker.js`

9. **saas-proration-worker**
   - Handles proration calculations
   - Manages mid-cycle billing changes
   - Location: `src/saas/workers/proration.worker.js`

### Category: Usage & Quota (1)
10. **saas-usage-quota-enforcement-worker**
    - Enforces usage quotas
    - Prevents overages
    - Location: `src/saas/workers/usageQuotaEnforcement.worker.js`

### Category: Wallet & Deduction (1)
11. **saas-wallet-deduction-worker**
    - Processes wallet deductions
    - Manages wallet transactions
    - Location: `src/saas/workers/walletDeduction.worker.js`

### Category: Notifications (1)
12. **saas-notification-worker**
    - Sends notifications
    - Handles multi-channel messaging
    - Location: `src/saas/workers/notificationWorker.js`

### Category: System & Maintenance (2)
13. **saas-hard-delete-worker**
    - Performs hard deletes
    - Removes expired data permanently
    - Location: `src/saas/workers/hardDeleteWorker.js`

14. **saas-health-worker**
    - Health checks and monitoring
    - System status verification
    - Location: `src/saas/workers/health.worker.js`

---

## 🚀 Quick Start (Copy & Paste)

### Option 1: Using Batch Script (Windows)
```batch
cd support-backend
start-workers.bat start
```

### Option 2: Using PowerShell Script
```powershell
.\manage-workers.ps1 start-all
```

### Option 3: Using PM2 Directly
```bash
cd support-backend
pm2 start pm2.worker.config.js
pm2 logs
```

---

## 📊 Subscription Database Overview

### Current Data Structure
```javascript
Subscription {
  _id: ObjectId,
  companyId: ObjectId,
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'GRACE',
  lifecycle: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'SUSPENDED',
  startAt: Date,
  endAt: Date,
  graceDays: Number,           // Default: 7
  graceStartAt: Date,
  graceEndAt: Date,
  planSnapshot: { ... },
  addonSnapshot: Array,
  previousSubscriptionId: ObjectId,
  lastCheckedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Status Values
| Status | Meaning | Action |
|--------|---------|--------|
| ACTIVE | Currently active | Normal operation |
| GRACE | In grace period | Can be reactivated |
| EXPIRED | Fully expired | Past grace period |
| SUSPENDED | Manually suspended | Admin action required |

### Lifecycle Values
| Lifecycle | Meaning |
|-----------|---------|
| ACTIVE | Normal operation |
| GRACE | In grace period (7 days default) |
| EXPIRED | Fully expired |
| SUSPENDED | Suspended by admin |

### Key Database Queries

```javascript
// Get subscription summary
db.subscriptions.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])

// Get active subscriptions
db.subscriptions.find({ status: 'ACTIVE' })

// Get expiring soon (7 days)
const now = Date.now();
const in7Days = now + (7 * 24 * 60 * 60 * 1000);
db.subscriptions.find({
  status: 'ACTIVE',
  endAt: { $gte: now, $lte: in7Days }
})

// Get grace period subscriptions
db.subscriptions.find({ lifecycle: 'GRACE' })

// Get company subscription
db.subscriptions.findOne({
  companyId: ObjectId('COMPANY_ID'),
  status: 'ACTIVE'
})
```

---

## 🛠️ Management Commands

### Basic Commands
```bash
# Start all workers
pm2 start pm2.worker.config.js

# View all running processes
pm2 list

# View logs
pm2 logs

# Stop all workers
pm2 stop all

# Restart all workers
pm2 restart all
```

### Monitoring Commands
```bash
# Real-time monitoring
pm2 monit

# Detailed worker info
pm2 info saas-subscription-expiry-worker

# View process status
pm2 show saas-subscription-expiry-worker
```

### Advanced Commands
```bash
# Start specific worker
pm2 start pm2.worker.config.js --only saas-subscription-expiry-worker

# Reload with zero-downtime
pm2 reload all

# Graceful shutdown
pm2 gracefulShutdown

# Kill PM2 daemon
pm2 kill
```

---

## 📁 Helper Scripts Usage

### Windows PowerShell Script: manage-workers.ps1
```powershell
# Start all workers
.\manage-workers.ps1 start-all

# Stop all workers
.\manage-workers.ps1 stop-all

# Restart all workers
.\manage-workers.ps1 restart-all

# Show status
.\manage-workers.ps1 status

# View logs
.\manage-workers.ps1 logs

# Monitor in real-time
.\manage-workers.ps1 monit

# Get worker info
.\manage-workers.ps1 info saas-subscription-expiry-worker

# Show help
.\manage-workers.ps1 help
```

### Database Query Helper: check-subscription-status.ps1
```powershell
# Show all available queries
.\check-subscription-status.ps1 help

# Show quick statistics queries
.\check-subscription-status.ps1 stats

# Show expiry analysis queries
.\check-subscription-status.ps1 expiry
```

### Windows Batch Script: start-workers.bat
```batch
# Start all workers
start-workers.bat start

# Stop all workers
start-workers.bat stop

# Restart all workers
start-workers.bat restart

# Show status
start-workers.bat status

# View logs
start-workers.bat logs

# Real-time monitor
start-workers.bat monit

# Delete all workers
start-workers.bat clean

# Show help
start-workers.bat help
```

---

## 📊 Log Files

All logs are stored in `support-backend/logs/` directory:

```
logs/
├── subscription-expiry-out.log
├── subscription-expiry-error.log
├── grace-reactivation-out.log
├── grace-reactivation-error.log
├── subscription-reminder-out.log
├── subscription-reminder-error.log
├── addon-expiry-out.log
├── addon-expiry-error.log
├── pending-addon-applier-out.log
├── pending-addon-applier-error.log
├── trial-expiry-out.log
├── trial-expiry-error.log
├── billing-out.log
├── billing-error.log
├── payment-reconciliation-out.log
├── payment-reconciliation-error.log
├── proration-out.log
├── proration-error.log
├── usage-quota-enforcement-out.log
├── usage-quota-enforcement-error.log
├── wallet-deduction-out.log
├── wallet-deduction-error.log
├── notification-out.log
├── notification-error.log
├── hard-delete-out.log
├── hard-delete-error.log
├── health-out.log
└── health-error.log
```

### View Logs
```bash
# View all logs in real-time
pm2 logs

# View specific worker logs
pm2 logs saas-subscription-expiry-worker

# View last N lines
pm2 logs --lines 100

# View error logs only
pm2 logs --err

# Clear all logs
pm2 flush
```

---

## 🎯 Typical Execution Flow

### Subscription Expiration Process

1. **subscriptionExpiryWorker** (runs periodically)
   ```
   ✓ Find subscriptions where endAt <= Date.now()
   ✓ Move to GRACE lifecycle
   ✓ Set graceEndAt = endAt + (graceDays * 24h)
   ✓ Log the change
   ```

2. **subscriptionGraceReactivationWorker** (runs periodically)
   ```
   ✓ Find subscriptions in GRACE lifecycle
   ✓ Check if Date.now() <= graceEndAt
   ✓ If yes: Keep in GRACE, remain ACTIVE status
   ✓ If no: Move to EXPIRED lifecycle
   ```

3. **subscriptionReminderWorker** (runs periodically)
   ```
   ✓ Find subscriptions expiring in next 7 days
   ✓ Send email/notification reminders
   ✓ Log reminder sent
   ```

4. **addonExpiryWorker** (runs periodically)
   ```
   ✓ Find expired addons in active subscriptions
   ✓ Remove from addonSnapshot
   ✓ Update subscription
   ```

5. **paymentReconciliationWorker** (runs periodically)
   ```
   ✓ Find subscriptions with pending payments
   ✓ Check payment records
   ✓ Update subscription status if payment confirmed
   ```

---

## ✅ Setup Verification Checklist

- [x] PM2 configuration updated with all 14 workers
- [x] All worker scripts verified to exist
- [x] Logging configured for all workers
- [x] Environment variables properly set
- [x] Database connectivity configured
- [x] Error handling in place
- [x] Documentation complete
- [x] Helper scripts created
- [x] Batch scripts created
- [x] PowerShell scripts created

---

## 🔍 Troubleshooting Guide

### Problem: Workers not starting
**Solution**:
```bash
pm2 logs                              # Check logs for errors
pm2 list                              # Verify script paths
pm2 kill && pm2 start pm2.worker.config.js  # Restart
```

### Problem: High memory usage
**Solution**:
```bash
pm2 monit                             # Monitor resources
pm2 restart saas-subscription-expiry-worker  # Restart specific worker
```

### Problem: Can't view logs
**Solution**:
```bash
pm2 flush                             # Clear logs
pm2 logs --lines 50                   # View recent logs
```

### Problem: Workers keep crashing
**Solution**:
```bash
pm2 show saas-subscription-expiry-worker  # Get details
pm2 logs saas-subscription-expiry-worker --err  # View errors
```

---

## 📞 Quick References

### PM2 Documentation
- https://pm2.keymetrics.io/docs

### MongoDB Queries
- Use MongoDB Compass for visual queries
- Use mongosh for command-line queries
- Sample queries in `check-subscription-status.ps1`

### Node.js Workers
- https://nodejs.org/api/worker_threads.html

---

## 🎓 Next Steps

1. ✅ **Start Workers**: `pm2 start pm2.worker.config.js`
2. ✅ **Verify Status**: `pm2 list`
3. ✅ **Check Logs**: `pm2 logs`
4. ✅ **Monitor**: `pm2 monit`
5. ✅ **Check Database**: Use queries from guide
6. ✅ **Save Config**: `pm2 save`
7. ✅ **Setup Startup**: `pm2 startup` (for production)

---

## 📝 Document Map

| Document | Purpose | Location |
|----------|---------|----------|
| WORKERS_SETUP_SUMMARY.md | Overview | Root |
| WORKERS_PM2_GUIDE.md | Comprehensive guide | Root |
| WORKERS_QUICK_START.md | Quick reference | Root |
| support-backend/WORKERS_README.md | Backend specific | support-backend/ |
| support-backend/pm2.worker.config.js | PM2 config | support-backend/ |
| support-backend/start-workers.bat | Batch script | support-backend/ |
| manage-workers.ps1 | PowerShell script | Root |
| check-subscription-status.ps1 | Database helper | Root |

---

**Status**: ✅ Production Ready
**Version**: 1.0
**Last Updated**: April 24, 2026

---

For questions or issues, refer to the specific guide document above or check PM2 logs with `pm2 logs`.
