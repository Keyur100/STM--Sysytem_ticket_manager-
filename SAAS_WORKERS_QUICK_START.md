# SAAS Workers Quick Setup Guide

## What Was Created

Seven separate worker files with independent MongoDB connections for handling subscription lifecycle:

### Worker Files
```
src/workers/saas/
├── subscriptionExpiryWorker.js      # Daily expiry checks
├── gracePeriodWorker.js             # Grace period management (14 days)
├── usageAlertWorker.js              # 90% usage alerts
├── planExpiryReminderWorker.js       # Expiry day reminders (14, 7, 3, 1 days)
├── addonExpiryWorker.js             # Addon expiration tracking
├── subscriptionRenewalWorker.js      # Auto-renewal handling
└── complianceAuditWorker.js         # Compliance & audit tracking
```

## Quick Start

### 1. Start All Workers
```bash
cd c:\Users\KeyurPrajapati\Desktop\HK\final\support-backend
npm run start:workers
```

### 2. Monitor Workers
```bash
pm2 list
pm2 logs subscription-expiry-worker
pm2 logs grace-period-worker
# etc...
```

### 3. Stop All Workers
```bash
pm2 stop all
```

### 4. Restart Specific Worker
```bash
pm2 restart subscription-expiry-worker
```

## Worker Details

### 1. Subscription Expiry Worker
- **Checks:** Daily subscription expiry status
- **Actions:** 
  - Marks expired subscriptions
  - Triggers grace period checks
  - Sends expiry reminders (7 days before)
- **Poll Rate:** Every 5 seconds

### 2. Grace Period Worker
- **Duration:** 14 days after expiry
- **Actions:**
  - Manages grace period transitions
  - Suspends accounts when grace period ends
  - Sends suspension notifications
- **Poll Rate:** Every 10 seconds

### 3. Usage Alert Worker
- **Triggers:** When usage reaches 90%
- **Monitors:**
  - User count
  - Storage (GB)
  - Tickets
  - API Calls
- **Actions:** Sends notifications
- **Poll Rate:** Every 3 seconds (real-time)

### 4. Plan Expiry Reminder Worker
- **Sends Reminders:** 14, 7, 3, and 1 day before expiry
- **Information Sent:** Days remaining, expiry date, company contact
- **Poll Rate:** Every 5 seconds

### 5. Addon Expiry Worker
- **Monitors:** All applied addons
- **Actions:**
  - Tracks expiration
  - Removes addon benefits when expired
  - Sends reminders 7 days before
  - Sends expiry notifications
- **Poll Rate:** Every 7 seconds

### 6. Subscription Renewal Worker
- **Triggers:** 7 days before expiry (if autoRenew enabled)
- **Actions:**
  - Verifies payment methods
  - Enqueues renewal requests
  - Only processes ACTIVE subscriptions
- **Poll Rate:** Every 8 seconds

### 7. Compliance & Audit Worker
- **Checks:**
  - Subscription status compliance
  - Usage violations
  - Payment compliance
- **Actions:**
  - Maintains audit logs
  - Sends compliance alerts
  - SLA tracking
- **Poll Rate:** Every 15 seconds

## Integration with Job Queue

All workers use the centralized job queue system. To enqueue a job manually:

```javascript
const { enqueueJob } = require('./src/libs/jobQueue');

// Enqueue subscription expiry check
await enqueueJob({
  type: 'subscription.expiry_check',
  payload: { 
    subscriptionId: '507f1f77bcf86cd799439011',
    companyId: '507f1f77bcf86cd799439012'
  },
  priority: 10
});

// Enqueue usage alert check
await enqueueJob({
  type: 'subscription.usage_check',
  payload: {
    companyId: '507f1f77bcf86cd799439012',
    metric: 'USER' // Optional - checks all if not provided
  },
  priority: 8
});
```

## Database Connection

Each worker file establishes its own MongoDB connection:

```javascript
const { connectMongoose } = require('../../models/mongoose');

if (require.main === module) {
  (async () => {
    await connectMongoose(); // Separate connection per worker
    baseWorkerLoop({
      workerId: 'workerName-' + process.pid,
      jobTypes: ['job.type'],
      processFunc: processorFunction,
      pollInterval: 5000
    });
  })();
}
```

Benefits:
- ✅ Connection pool isolation
- ✅ Independent failure handling
- ✅ Prevents connection exhaustion
- ✅ Better performance isolation

## Required Models

Make sure these models exist in `src/saas/models/`:
- ✅ `subscription.model.js` 
- ✅ `company.model.js`
- ✅ `usageRecord.model.js`
- ✅ `addon.model.js`
- ✅ `plan.model.js`
- ✅ `auditTrail.model.js`

## Environment Setup

Ensure `.env` file has:
```
MONGODB_URI=mongodb://localhost:27017/your-db
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

## Job Types Registered

New job types added to `src/constantsJobs.js`:

**Subscription Jobs:**
- `subscription.expiry_check`
- `subscription.grace_period_check`
- `subscription.usage_check`
- `subscription.expiry_reminder`
- `subscription.addon_expiry_check`
- `subscription.renewal_check`
- `subscription.renewal_request`
- `subscription.compliance_audit`
- `subscription.sla_check`
- `subscription.account_suspended`

**Notification Jobs:**
- `notification.usage_alert`
- `notification.plan_expiry_reminder`
- `notification.addon_expiry_reminder`
- `notification.addon_expired`
- `notification.compliance_alert`

## Testing Workers

### Test Subscription Expiry
```javascript
const { enqueueJob } = require('./src/libs/jobQueue');

await enqueueJob({
  type: 'subscription.expiry_check',
  payload: { 
    subscriptionId: 'YOUR_SUBSCRIPTION_ID',
    companyId: 'YOUR_COMPANY_ID'
  },
  priority: 10
});
```

### View Worker Status
```bash
pm2 status
pm2 show subscription-expiry-worker
```

### View Logs
```bash
pm2 logs subscription-expiry-worker --lines 50
```

## PM2 Configuration

Workers are configured in `pm2.worker.config.js` with:
- No watch mode (avoid file monitoring)
- Restart on crash
- Proper log handling
- Multiple instance support possible

## Troubleshooting

### Workers Not Starting
```bash
# Check if PM2 is installed
npm list pm2

# Start with detailed output
pm2 start pm2.worker.config.js --no-daemon
```

### Connection Issues
```bash
# Verify MongoDB is running
mongosh

# Check Redis
redis-cli ping
```

### Worker Stuck
```bash
# Kill and restart
pm2 delete all
npm run start:workers
```

## Performance Tips

1. **Adjust Poll Intervals** - Reduce for faster checks, increase to reduce load
2. **Monitor Queue Depth** - Check how many jobs are pending
3. **Scale Workers** - Add more instances if queue backs up
4. **Optimize Queries** - Use indexes on frequently queried fields
5. **Archive Old Records** - Clean up old audit trails

## Next Steps

1. ✅ Start the workers: `npm run start:workers`
2. ✅ Monitor the logs: `pm2 logs`
3. ✅ Test with sample jobs
4. ✅ Configure alert endpoints
5. ✅ Set up Prometheus/Grafana for metrics

---

For detailed documentation, see: [SAAS_WORKERS_DOCUMENTATION.md](./SAAS_WORKERS_DOCUMENTATION.md)
