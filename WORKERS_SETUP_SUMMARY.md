# SAAS Workers Setup - Complete Summary

## ✅ What's Been Done

### 1. Updated PM2 Configuration
- **File**: `support-backend/pm2.worker.config.js`
- **Status**: ✅ Complete with all 14 SAAS workers
- Contains proper logging, error handling, and environment configuration

### 2. Created Documentation Files
- ✅ `WORKERS_PM2_GUIDE.md` - Comprehensive PM2 guide
- ✅ `WORKERS_QUICK_START.md` - Quick reference and common commands
- ✅ `manage-workers.ps1` - PowerShell management script
- ✅ `check-subscription-status.ps1` - Database status checker script

---

## 📋 All 14 SAAS Workers Configured

### Subscription Management (3)
1. `saas-subscription-expiry-worker` - Handles subscription expiration
2. `saas-subscription-grace-reactivation-worker` - Manages grace period logic
3. `saas-subscription-reminder-worker` - Sends expiry reminders

### Addon Management (2)
4. `saas-addon-expiry-worker` - Expires addons
5. `saas-pending-addon-applier-worker` - Applies pending addons

### Trial Management (1)
6. `saas-trial-expiry-worker` - Manages trial expiration

### Billing & Payment (3)
7. `saas-billing-worker` - Processes billing
8. `saas-payment-reconciliation-worker` - Reconciles payments
9. `saas-proration-worker` - Calculates proration

### Usage & Quota (1)
10. `saas-usage-quota-enforcement-worker` - Enforces usage limits

### Wallet & Deduction (1)
11. `saas-wallet-deduction-worker` - Processes wallet deductions

### Notifications (1)
12. `saas-notification-worker` - Sends notifications

### System & Maintenance (2)
13. `saas-hard-delete-worker` - Hard deletes expired data
14. `saas-health-worker` - Health checks

---

## 🚀 Quick Start Commands

### Start All Workers
```bash
cd support-backend
pm2 start pm2.worker.config.js
```

### View Running Workers
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

### Restart All Workers
```bash
pm2 restart all
```

---

## 📁 Files Created/Updated

| File | Purpose |
|------|---------|
| `pm2.worker.config.js` | 🔄 Updated with all 14 workers |
| `WORKERS_PM2_GUIDE.md` | 📖 Comprehensive PM2 guide |
| `WORKERS_QUICK_START.md` | 📋 Quick reference guide |
| `manage-workers.ps1` | 🛠️ PowerShell management script |
| `check-subscription-status.ps1` | 🔍 Database checker script |

---

## 💾 Current Subscription Database Structure

### Subscription Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  planId: ObjectId,
  planSnapshot: {
    name: String,              // e.g., "Professional Plan"
    durationDays: Number,      // e.g., 365
    priceInPaise: Number,      // Price in paise (1/100 of rupee)
    modulePermissions: Array   // List of permissions
  },
  status: String,              // ACTIVE | EXPIRED | SUSPENDED | GRACE
  lifecycle: String,           // ACTIVE | GRACE | EXPIRED | SUSPENDED
  startAt: Date,              // Subscription start date
  endAt: Date,                // Subscription end date
  graceDays: Number,          // Days allowed in grace (default: 7)
  graceStartAt: Date,         // When grace period started
  graceEndAt: Date,           // When grace period ends
  planPricePaise: Number,     // Price in paise
  addonSnapshot: Array,       // Active addons
  previousSubscriptionId: ObjectId || null,  // Previous subscription ID
  lastCheckedAt: Date,        // Last worker check time
  createdAt: Date,
  updatedAt: Date
}
```

### Subscription Status Values
- **ACTIVE** - Currently active subscription
- **EXPIRED** - Subscription has passed end date
- **SUSPENDED** - Manually suspended by admin
- **GRACE** - In grace period (7 days by default)

### Subscription Lifecycle Values
- **ACTIVE** - Normal active status
- **GRACE** - In grace period, can be reactivated
- **EXPIRED** - Fully expired, past grace period
- **SUSPENDED** - Manually suspended

---

## 🔍 Database Queries for Current Data

### Count by Status
```javascript
db.subscriptions.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])
```

### Count by Lifecycle
```javascript
db.subscriptions.aggregate([
  { $group: { _id: '$lifecycle', count: { $sum: 1 } } }
])
```

### Get Active Subscriptions
```javascript
db.subscriptions.find({ status: 'ACTIVE' })
```

### Get Grace Period Subscriptions
```javascript
db.subscriptions.find({ lifecycle: 'GRACE' })
```

### Get Expired Subscriptions
```javascript
db.subscriptions.find({ status: 'EXPIRED' })
```

### Get Expiring Soon (Next 7 Days)
```javascript
const now = Date.now();
const in7Days = now + (7 * 24 * 60 * 60 * 1000);
db.subscriptions.find({
  status: 'ACTIVE',
  endAt: { $gte: now, $lte: in7Days }
})
```

### Get by Company
```javascript
db.subscriptions.findOne({
  companyId: ObjectId('COMPANY_ID'),
  status: 'ACTIVE'
}).sort({ createdAt: -1 })
```

---

## 📊 Log Files

All logs are stored in `support-backend/logs/` with format `[worker]-[out|error].log`

Examples:
- `subscription-expiry-out.log` - Standard output
- `subscription-expiry-error.log` - Error logs
- `billing-out.log` - Billing worker logs
- `payment-reconciliation-error.log` - Payment reconciliation errors

View with:
```bash
pm2 logs [worker-name]
```

---

## 🛠️ PowerShell Management Scripts

### manage-workers.ps1
A comprehensive PowerShell script for managing all workers:

```powershell
.\manage-workers.ps1 start-all      # Start all workers
.\manage-workers.ps1 stop-all       # Stop all workers
.\manage-workers.ps1 restart-all    # Restart all workers
.\manage-workers.ps1 status         # Show status
.\manage-workers.ps1 logs           # View logs
.\manage-workers.ps1 monit          # Real-time monitoring
.\manage-workers.ps1 info [name]    # Worker info
```

### check-subscription-status.ps1
Database query helper for subscription data:

```powershell
.\check-subscription-status.ps1 help   # Show all queries
.\check-subscription-status.ps1 stats  # Quick stats queries
.\check-subscription-status.ps1 expiry # Expiry analysis queries
```

---

## 🎯 Typical Worker Execution Flow

1. **Subscription Expiry Worker** (runs periodically)
   - Finds subscriptions where `endAt <= now`
   - Moves them to GRACE lifecycle
   - Sets `graceEndAt = endAt + (graceDays * 24h)`

2. **Grace Reactivation Worker** (checks grace period)
   - If `now <= graceEndAt`: Keep in GRACE lifecycle
   - If `now > graceEndAt`: Mark as EXPIRED

3. **Subscription Reminder Worker** (sends notifications)
   - Sends reminders to companies with expiring subscriptions
   - Suggests upgrades or renewals

4. **Addon Expiry Worker** (manages addon lifecycle)
   - Removes expired addons from active subscriptions

5. **Payment Reconciliation Worker** (verifies payments)
   - Ensures all payments are recorded
   - Updates subscription status based on payment status

6. **Billing Worker** (processes invoicing)
   - Generates invoices for active subscriptions
   - Handles proration for mid-cycle changes

---

## ⚙️ Worker Configuration Details

### Each Worker Has
- ✅ Proper error logging
- ✅ Stdout logging
- ✅ Date-formatted logs (YYYY-MM-DD HH:mm:ss Z)
- ✅ Environment variables
- ✅ Worker type identification
- ✅ Single instance execution (fork mode)

### Log File Structure
- **Error File**: `logs/[worker-name]-error.log`
- **Output File**: `logs/[worker-name]-out.log`
- **Format**: `[timestamp] [level] message`

---

## 🔧 Common Tasks

### Start Development
```bash
cd support-backend
npm install  # if needed
pm2 start pm2.worker.config.js
pm2 logs
```

### Monitor Execution
```bash
pm2 monit      # Real-time CPU/Memory
pm2 list       # Show all processes
pm2 show [worker-name]  # Detailed info
```

### Production Deployment
```bash
pm2 start pm2.worker.config.js --env production
pm2 save       # Save configuration
pm2 startup    # Generate startup script
```

### Troubleshooting
```bash
pm2 logs       # View all logs
pm2 flush      # Clear logs
pm2 kill       # Kill PM2 daemon
pm2 restart all # Restart everything
```

---

## 📞 Support & References

- **PM2 Documentation**: https://pm2.keymetrics.io/
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Node.js Workers**: https://nodejs.org/api/worker_threads.html

---

## 🎓 Next Steps

1. ✅ Start all workers: `pm2 start pm2.worker.config.js`
2. ✅ Verify logs: `pm2 logs`
3. ✅ Check database: Run queries from check-subscription-status.ps1
4. ✅ Monitor status: `pm2 monit`
5. ✅ Save configuration: `pm2 save`

---

**Last Updated**: April 24, 2026
**Status**: ✅ Complete and Ready for Use
