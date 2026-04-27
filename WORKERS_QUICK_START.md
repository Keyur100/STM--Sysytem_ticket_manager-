# PM2 Workers Quick Start

## 🚀 Quick Start (Copy & Paste)

### Start All Workers
```powershell
cd support-backend
pm2 start pm2.worker.config.js
pm2 logs
```

### View All Running Workers
```powershell
pm2 list
```

### Stop All Workers
```powershell
pm2 stop all
```

### Restart All Workers
```powershell
pm2 restart all
```

---

## 📋 Worker List Overview

| Worker | Purpose | Location |
|--------|---------|----------|
| `saas-subscription-expiry-worker` | Checks & expires subscriptions | `src/saas/workers/subscription/subscriptionExpiryWorker.js` |
| `saas-subscription-grace-reactivation-worker` | Handles grace period reactivation | `src/saas/workers/subscription/subscriptionGraceReactivationWorker.js` |
| `saas-subscription-reminder-worker` | Sends expiry reminders | `src/saas/workers/subscription/subscriptionReminderWorker.js` |
| `saas-addon-expiry-worker` | Expires addons | `src/saas/workers/addonExpiry.worker.js` |
| `saas-pending-addon-applier-worker` | Applies pending addons | `src/saas/workers/pendingAddonApplier.worker.js` |
| `saas-trial-expiry-worker` | Expires trial periods | `src/saas/workers/trialExpiry.worker.js` |
| `saas-billing-worker` | Processes billing | `src/saas/workers/billing.worker.js` |
| `saas-payment-reconciliation-worker` | Reconciles payments | `src/saas/workers/paymentReconciliation.worker.js` |
| `saas-proration-worker` | Calculates proration | `src/saas/workers/proration.worker.js` |
| `saas-usage-quota-enforcement-worker` | Enforces usage quotas | `src/saas/workers/usageQuotaEnforcement.worker.js` |
| `saas-wallet-deduction-worker` | Deducts from wallet | `src/saas/workers/walletDeduction.worker.js` |
| `saas-notification-worker` | Sends notifications | `src/saas/workers/notificationWorker.js` |
| `saas-hard-delete-worker` | Hard deletes expired data | `src/saas/workers/hardDeleteWorker.js` |
| `saas-health-worker` | Health checks | `src/saas/workers/health.worker.js` |

---

## 🔧 Useful Commands

### View Logs
```powershell
pm2 logs saas-subscription-expiry-worker      # View specific worker logs
pm2 logs                                       # View all logs
pm2 logs --lines 100                         # View last 100 lines
```

### Monitor Resources
```powershell
pm2 monit                                     # Real-time monitoring
pm2 list                                      # Show all processes
```

### Individual Worker Control
```powershell
pm2 start pm2.worker.config.js --only saas-subscription-expiry-worker
pm2 stop saas-subscription-expiry-worker
pm2 restart saas-subscription-expiry-worker
pm2 delete saas-subscription-expiry-worker
```

---

## 📊 Current Subscription Data in Database

### Subscription Status Values
- `ACTIVE` - Subscription is currently active
- `EXPIRED` - Subscription has passed the end date
- `SUSPENDED` - Subscription was manually suspended
- `GRACE` - Subscription is in grace period

### Subscription Lifecycle Values
- `ACTIVE` - Normal active status
- `GRACE` - In grace period (can still be reactivated)
- `EXPIRED` - Past grace period, fully expired
- `SUSPENDED` - Manually suspended by admin

### Database Queries

```javascript
// Check current subscription stats
db.subscriptions.aggregate([
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 }
    }
  }
])

// Result example:
// { _id: 'ACTIVE', count: 150 }
// { _id: 'EXPIRED', count: 45 }
// { _id: 'GRACE', count: 12 }
// { _id: 'SUSPENDED', count: 3 }

// Get expiring subscriptions (next 7 days)
const now = Date.now();
const in7Days = now + (7 * 24 * 60 * 60 * 1000);
db.subscriptions.find({
  status: 'ACTIVE',
  endAt: { $gte: now, $lte: in7Days }
}).count()

// Get grace period subscriptions
db.subscriptions.find({ lifecycle: 'GRACE' }).count()

// Get expired subscriptions
db.subscriptions.find({ status: 'EXPIRED' }).count()
```

---

## 🎯 Typical Execution Flow

1. **Subscription Expiry Worker** runs periodically
   - Checks for subscriptions past `endAt` date
   - Moves them to GRACE lifecycle

2. **Grace Reactivation Worker** checks grace period
   - If still in grace: keep in GRACE lifecycle
   - If past grace end: mark as EXPIRED

3. **Subscription Reminder Worker** sends notifications
   - Reminds companies of upcoming expiry
   - Suggests upgrades or renewals

4. **Addon Expiry Worker** handles addon expiration
   - Removes expired addons from subscription

5. **Payment Reconciliation Worker** verifies payments
   - Ensures all payments are properly recorded
   - Updates subscription status based on payment

---

## 📝 Log File Locations

All logs stored in `support-backend/logs/`:
- `subscription-expiry-out.log`
- `subscription-expiry-error.log`
- `grace-reactivation-out.log`
- `grace-reactivation-error.log`
- `subscription-reminder-out.log`
- `subscription-reminder-error.log`
- (and many more...)

View in real-time:
```powershell
pm2 logs subscription-expiry
```

---

## ⚡ One-Liner Commands

```powershell
# Start everything
cd support-backend && pm2 start pm2.worker.config.js

# See everything
pm2 list

# Stop everything
pm2 stop all

# Restart everything
pm2 restart all

# Delete everything
pm2 delete all

# Kill PM2
pm2 kill

# Watch logs
pm2 logs

# Monitor in real-time
pm2 monit
```
