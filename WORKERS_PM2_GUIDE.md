# SAAS Workers PM2 Configuration Guide

## Overview
This guide provides all commands and configuration for managing SAAS workers using PM2.

---

## 📋 All Available Workers

### Subscription Management Workers
- `saas-subscription-expiry-worker` - Handles expired subscriptions
- `saas-subscription-grace-reactivation-worker` - Manages grace period reactivation
- `saas-subscription-reminder-worker` - Sends subscription reminders

### Addon Management Workers
- `saas-addon-expiry-worker` - Handles addon expiration
- `saas-pending-addon-applier-worker` - Applies pending addons

### Trial Management
- `saas-trial-expiry-worker` - Handles trial period expiration

### Billing & Payment
- `saas-billing-worker` - Processes billing operations
- `saas-payment-reconciliation-worker` - Reconciles payments
- `saas-proration-worker` - Handles proration calculations

### Usage & Quota
- `saas-usage-quota-enforcement-worker` - Enforces usage quotas

### Wallet & Deduction
- `saas-wallet-deduction-worker` - Processes wallet deductions

### Notifications
- `saas-notification-worker` - Sends notifications

### System & Maintenance
- `saas-hard-delete-worker` - Performs hard deletes of expired data
- `saas-health-worker` - Health check and monitoring

---

## 🚀 Quick Start Commands

### Start All Workers
```bash
cd support-backend
pm2 start pm2.worker.config.js
```

### Start Specific Worker
```bash
pm2 start pm2.worker.config.js --only saas-subscription-expiry-worker
```

### Stop All Workers
```bash
pm2 stop all
```

### Restart All Workers
```bash
pm2 restart all
```

### Delete All Workers
```bash
pm2 delete all
```

### View All Running Processes
```bash
pm2 list
```

### View Worker Logs (Real-time)
```bash
pm2 logs
```

### View Specific Worker Logs
```bash
pm2 logs saas-subscription-expiry-worker
```

### Save PM2 Configuration
```bash
pm2 save
```

### Resurrect Saved Configuration (on restart)
```bash
pm2 resurrect
```

### Generate Startup Script
```bash
pm2 startup
pm2 save
```

---

## 📊 Log Files

All log files are stored in `logs/` directory:

- `subscription-expiry-out.log` - Subscription expiry logs
- `subscription-expiry-error.log` - Subscription expiry errors
- `grace-reactivation-out.log` - Grace reactivation logs
- `grace-reactivation-error.log` - Grace reactivation errors
- `subscription-reminder-out.log` - Reminder logs
- `subscription-reminder-error.log` - Reminder errors
- `addon-expiry-out.log` - Addon expiry logs
- `addon-expiry-error.log` - Addon expiry errors
- `pending-addon-applier-out.log` - Pending addon logs
- `pending-addon-applier-error.log` - Pending addon errors
- `trial-expiry-out.log` - Trial expiry logs
- `trial-expiry-error.log` - Trial expiry errors
- `billing-out.log` - Billing logs
- `billing-error.log` - Billing errors
- `payment-reconciliation-out.log` - Payment reconciliation logs
- `payment-reconciliation-error.log` - Payment reconciliation errors
- `proration-out.log` - Proration logs
- `proration-error.log` - Proration errors
- `usage-quota-enforcement-out.log` - Usage quota logs
- `usage-quota-enforcement-error.log` - Usage quota errors
- `wallet-deduction-out.log` - Wallet deduction logs
- `wallet-deduction-error.log` - Wallet deduction errors
- `notification-out.log` - Notification logs
- `notification-error.log` - Notification errors
- `hard-delete-out.log` - Hard delete logs
- `hard-delete-error.log` - Hard delete errors
- `health-out.log` - Health check logs
- `health-error.log` - Health check errors

---

## 🔍 Monitoring Commands

### Monitor Real-time Stats
```bash
pm2 monit
```

### Get Detailed Process Info
```bash
pm2 info saas-subscription-expiry-worker
```

### Show All Process Logs
```bash
pm2 show saas-subscription-expiry-worker
```

### Check CPU & Memory Usage
```bash
pm2 list
```

---

## 🛠️ Advanced Commands

### Kill PM2 Daemon
```bash
pm2 kill
```

### Flush Logs
```bash
pm2 flush
```

### Reload All Workers (Graceful Restart)
```bash
pm2 reload all
```

### Force Graceful Shutdown
```bash
pm2 gracefulShutdown
```

### View PM2 Configuration
```bash
pm2 show pm2.worker.config.js
```

---

## 📦 Database Subscription Data Structure

### Subscription Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  planId: ObjectId,
  planSnapshot: {
    name: String,
    durationDays: Number,
    priceInPaise: Number,
    modulePermissions: Array
  },
  status: String, // ACTIVE, EXPIRED, SUSPENDED, GRACE
  lifecycle: String, // ACTIVE, GRACE, EXPIRED, SUSPENDED
  startAt: Date,
  endAt: Date,
  graceDays: Number,
  graceStartAt: Date,
  graceEndAt: Date,
  planPricePaise: Number,
  addonSnapshot: Array,
  previousSubscriptionId: ObjectId,
  lastCheckedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Query Current Subscription Data

#### Get All Active Subscriptions
```javascript
db.subscriptions.find({ status: 'ACTIVE' })
```

#### Get Expiring Subscriptions (Next 7 days)
```javascript
const now = Date.now();
const in7Days = now + (7 * 24 * 60 * 60 * 1000);
db.subscriptions.find({ 
  status: 'ACTIVE', 
  endAt: { $gte: now, $lte: in7Days } 
})
```

#### Get Grace Period Subscriptions
```javascript
db.subscriptions.find({ lifecycle: 'GRACE' })
```

#### Get Expired Subscriptions
```javascript
db.subscriptions.find({ status: 'EXPIRED' })
```

#### Get Subscriptions by Status
```javascript
db.subscriptions.find({ status: { $in: ['ACTIVE', 'GRACE'] } })
```

#### Count Subscriptions by Status
```javascript
db.subscriptions.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])
```

---

## 📈 Typical Workflow

### 1. Development Setup
```bash
cd support-backend
npm install
pm2 start pm2.worker.config.js
pm2 logs
```

### 2. Verify Workers
```bash
pm2 list
pm2 info saas-subscription-expiry-worker
```

### 3. Monitor Execution
```bash
pm2 monit
```

### 4. Production Deployment
```bash
pm2 start pm2.worker.config.js --env production
pm2 save
pm2 startup
```

### 5. Check Logs
```bash
pm2 logs --lines 100
```

---

## ⚙️ Configuration Details

### Environment Variables
- `NODE_ENV` - Set to 'development' or 'production'
- `WORKER_TYPE` - Identifies the worker type for logging

### Log Configuration
- **Error Log**: Captures all errors and stack traces
- **Output Log**: Captures console.log statements
- **Date Format**: `YYYY-MM-DD HH:mm:ss Z` for easy parsing

### Execution Mode
- All workers use `fork` mode for stability
- Single instance per worker (no clustering)

---

## 🐛 Troubleshooting

### Workers Not Starting
```bash
# Check for errors
pm2 logs

# Verify script paths
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

### Check Worker Status
```bash
pm2 show saas-subscription-expiry-worker
```

### View Process Uptime
```bash
pm2 list
```

---

## 📝 Example Database Operations

### Check Subscription Status
```javascript
// Get subscription by ID
db.subscriptions.findOne({ _id: ObjectId("...") })

// Get company's current subscription
db.subscriptions.findOne({ 
  companyId: ObjectId("..."), 
  status: 'ACTIVE' 
}).sort({ createdAt: -1 })

// Get subscriptions in grace period
db.subscriptions.find({ lifecycle: 'GRACE' }).count()
```

### Update Subscription Status
```javascript
// Move to grace period
db.subscriptions.updateOne(
  { _id: ObjectId("...") },
  { $set: { lifecycle: 'GRACE', graceStartAt: Date.now() } }
)

// Mark as expired
db.subscriptions.updateOne(
  { _id: ObjectId("...") },
  { $set: { status: 'EXPIRED' } }
)
```

---

## 📞 Support

For issues or questions:
1. Check PM2 logs: `pm2 logs`
2. Verify worker scripts exist
3. Check database connectivity
4. Review worker-specific logs in `logs/` directory
