# SAAS Subscription Workers Documentation

## Overview
This document describes all the separate worker processes that handle subscription lifecycle management, usage tracking, and compliance monitoring. Each worker has its own MongoDB connection and runs independently as a PM2 process.

## Workers Summary

### 1. **Subscription Expiry Worker** (`subscriptionExpiryWorker.js`)
**Purpose:** Daily monitoring of subscription expiry dates

**Responsibilities:**
- Checks subscriptions against current date
- Marks subscriptions as EXPIRED when `endAt <= now`
- Triggers grace period checks for expired subscriptions
- Sends expiry reminders when subscription is within 7 days of expiry

**Job Type:** `subscription.expiry_check`

**Payload Structure:**
```javascript
{
  subscriptionId: ObjectId,
  companyId: ObjectId
}
```

**Output:**
```javascript
{
  processed: boolean,
  status: "EXPIRED" | "APPROACHING_EXPIRY" | "ACTIVE",
  expiredAt: Date,
  daysUntilExpiry: number
}
```

**Poll Interval:** 5 seconds

---

### 2. **Grace Period Expiry Worker** (`gracePeriodWorker.js`)
**Purpose:** Manages grace period after subscription expiry

**Responsibilities:**
- Monitors subscriptions in grace period (14 days after expiry)
- Transitions subscriptions from EXPIRED to GRACE_PERIOD status
- Marks subscription as TERMINATED when grace period ends
- Suspends company account when grace period expires
- Updates company status to SUSPENDED

**Grace Period Duration:** 14 days

**Job Type:** `subscription.grace_period_check`

**Payload Structure:**
```javascript
{
  subscriptionId: ObjectId,
  companyId: ObjectId
}
```

**Output:**
```javascript
{
  processed: boolean,
  status: "GRACE_PERIOD" | "TERMINATED",
  graceEndDate: Date,
  daysRemaining: number
}
```

**Poll Interval:** 10 seconds

---

### 3. **Usage Alert Worker** (`usageAlertWorker.js`)
**Purpose:** Real-time usage monitoring and alerting at 90% threshold

**Responsibilities:**
- Monitors plan usage for all metrics (Users, GB, Tickets, API Calls)
- Calculates percentage usage against plan limits
- Sends alerts when usage reaches 90% threshold
- Differentiates between APPROACHING (90-99%) and EXCEEDED (100%+) statuses
- Supports unlimited plans (limit = -1)

**Supported Metrics:**
- USER: User count
- GB: Storage in GB
- TICKET: Number of tickets
- API_CALL: API call count

**Job Type:** `subscription.usage_check`

**Payload Structure:**
```javascript
{
  companyId: ObjectId,
  metric?: "USER" | "GB" | "TICKET" | "API_CALL" // Optional, checks all if not provided
}
```

**Output:**
```javascript
{
  processed: boolean,
  alertCount: number,
  alerts: [
    {
      metric: string,
      usage: number,
      limit: number,
      usagePercent: number,
      alertType: "APPROACHING" | "EXCEEDED"
    }
  ]
}
```

**Poll Interval:** 3 seconds

---

### 4. **Plan Expiry Reminder Worker** (`planExpiryReminderWorker.js`)
**Purpose:** Sends scheduled reminders before subscription expiry

**Responsibilities:**
- Sends reminders at specific intervals before expiry
- Reminder intervals: 14 days, 7 days, 3 days, 1 day
- Enqueues notification jobs for each reminder day
- Includes company contact information in reminders

**Reminder Days Before Expiry:**
- 14 days
- 7 days
- 3 days
- 1 day

**Job Type:** `subscription.expiry_reminder`

**Payload Structure:**
```javascript
{
  subscriptionId: ObjectId,
  companyId: ObjectId,
  daysUntilExpiry: number
}
```

**Output:**
```javascript
{
  processed: boolean,
  daysUntilExpiry: number,
  reminderSent: boolean
}
```

**Poll Interval:** 5 seconds

---

### 5. **Addon Expiry Worker** (`addonExpiryWorker.js`)
**Purpose:** Monitors addon subscriptions and their expiry dates

**Responsibilities:**
- Checks applied addons for expiration
- Marks expired addons with status EXPIRED
- Removes addon benefits from user pricing when expired
- Sends expiry reminders 7 days before addon expiry
- Sends expiry notifications when addon expires
- Supports addons without expiry dates (unlimited)

**Job Type:** `subscription.addon_expiry_check`

**Payload Structure:**
```javascript
{
  companyId: ObjectId
}
```

**Output:**
```javascript
{
  processed: boolean,
  expiredCount: number,
  expiringCount: number,
  expiredAddons: Array,
  expiringAddons: Array
}
```

**Poll Interval:** 7 seconds

---

### 6. **Subscription Renewal Worker** (`subscriptionRenewalWorker.js`)
**Purpose:** Handles automatic subscription renewals

**Responsibilities:**
- Checks for subscriptions with autoRenew enabled
- Triggers renewal 7 days before expiry
- Verifies company payment methods are available
- Enqueues renewal requests with payment system
- Only processes ACTIVE subscriptions

**Renewal Trigger Window:** 7 days before expiry

**Job Type:** `subscription.renewal_check`

**Payload Structure:**
```javascript
{
  subscriptionId: ObjectId,
  companyId: ObjectId
}
```

**Output:**
```javascript
{
  processed: boolean,
  daysUntilExpiry: number,
  renewalRequested: boolean
}
```

**Poll Interval:** 8 seconds

---

### 7. **Compliance & Audit Worker** (`complianceAuditWorker.js`)
**Purpose:** Monitors subscription compliance and maintains audit trails

**Responsibilities:**
- Performs compliance checks on subscriptions
- Validates subscription status
- Tracks usage violations
- Verifies payment compliance
- Maintains detailed audit logs
- Sends compliance alerts for non-compliant accounts
- Supports SLA checks

**Audit Checks:**
1. **Subscription Status Compliance** - Ensures subscription status is ACTIVE or GRACE_PERIOD
2. **Usage Violations** - Records all usage metrics
3. **Payment Compliance** - Verifies payments are recorded

**Job Types:** 
- `subscription.compliance_audit`
- `subscription.sla_check`

**Payload Structure:**
```javascript
{
  companyId: ObjectId,
  auditType?: "GENERAL" | "SLA_CHECK" | "PAYMENT_CHECK"
}
```

**Output:**
```javascript
{
  processed: boolean,
  auditId: ObjectId,
  status: "COMPLIANT" | "NON_COMPLIANT",
  findingCount: number
}
```

**Poll Interval:** 15 seconds

---

## Job Queue Integration

All workers integrate with the centralized job queue system. Jobs are enqueued in the following scenarios:

### Enqueued Job Types from Workers:

| Job Type | Triggered By | Purpose |
|----------|--------------|---------|
| `subscription.grace_period_check` | Expiry Worker | Initiate grace period check |
| `subscription.expiry_reminder` | Expiry Worker | Send expiry reminders |
| `notification.usage_alert` | Usage Alert Worker | Notify about usage |
| `notification.plan_expiry_reminder` | Expiry Reminder Worker | Notify about upcoming expiry |
| `notification.addon_expiry_reminder` | Addon Worker | Notify about addon expiry |
| `notification.addon_expired` | Addon Worker | Notify addon has expired |
| `subscription.renewal_request` | Renewal Worker | Process renewal |
| `notification.compliance_alert` | Compliance Worker | Alert compliance issues |
| `subscription.account_suspended` | Grace Period Worker | Notify suspension |

---

## Database Models Used

### Core Models:
- **Subscription** - Subscription records with status tracking
- **Company** - Company profile and status
- **UsageRecord** - Tracks usage metrics
- **Addon** - Addon definitions and benefits
- **Plan** - Plan definitions with limits
- **AuditTrail** - Audit logs for compliance

### Required Fields in Subscription:
```javascript
{
  subscriptionId: ObjectId,
  companyId: ObjectId,
  planId: ObjectId,
  startAt: Number (timestamp),
  endAt: Number (timestamp),
  status: String (ACTIVE, EXPIRED, GRACE_PERIOD, TERMINATED),
  autoRenew: Boolean,
  planSnapshot: Object,
  addonSnapshot: Array
}
```

---

## Configuration

### Constants
Job types and statuses are defined in:
- `src/constantsJobs.js` - Job type constants
- `src/saas/constants/subscription.constant.js` - Subscription statuses

### Environment Variables
Required environment variables in `.env`:
```
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
NODE_ENV=development|production
```

---

## Running Workers

### Start All Workers via PM2
```bash
npm run start:workers
```

This will start all workers defined in `pm2.worker.config.js`:
- subscription-expiry-worker
- grace-period-worker
- usage-alert-worker
- plan-expiry-reminder-worker
- addon-expiry-worker
- subscription-renewal-worker
- compliance-audit-worker

### Start Individual Worker
```bash
node src/workers/saas/subscriptionExpiryWorker.js
node src/workers/saas/gracePeriodWorker.js
# ... etc
```

### Monitor Workers
```bash
pm2 list
pm2 logs subscription-expiry-worker
pm2 restart grace-period-worker
```

---

## Architecture

### Worker Pattern
All workers follow the same pattern:

1. **Connection Setup** - Connect to MongoDB
2. **Base Loop** - Polling mechanism for job queue
3. **Job Processing** - Process individual jobs
4. **Error Handling** - Catch and log errors, optionally enqueue for retry
5. **Heartbeat** - Maintain worker health status

### Independent MongoDB Connections
Each worker file imports and calls `connectMongoose()`:
```javascript
const { connectMongoose } = require('../../models/mongoose');

// In the main block
if (require.main === module) {
  (async () => {
    try {
      await connectMongoose(); // Separate connection per worker
      // ... start worker loop
    } catch (err) {
      logger.error(err, 'Failed to start worker');
      process.exit(1);
    }
  })();
}
```

This ensures:
- Each worker process has its own MongoDB connection pool
- Connection isolation prevents connection pool exhaustion
- Failure in one worker doesn't affect others
- Graceful error handling and worker restart capability

---

## Monitoring & Debugging

### Log Files
Logs are written through the centralized logger:
```javascript
const logger = require('../../libs/logger');
logger.info('Message');
logger.warn('Warning');
logger.error(err, 'Error');
```

### Health Checks
Each worker updates its status in the Worker model:
```javascript
WorkerModel.updateOne(
  { workerId },
  { $set: { lastHeartbeat: new Date(), status: 'ONLINE' } },
  { upsert: true }
)
```

### Metrics to Track
- Job processing rate
- Error rate and types
- Worker uptime
- Queue depth
- Job processing latency

---

## Performance Tuning

### Poll Intervals (seconds)
- Subscription Expiry: 5s - Frequent checks needed
- Grace Period: 10s - Less frequent, longer duration
- Usage Alert: 3s - Real-time alerts important
- Plan Expiry Reminder: 5s - Timely reminders
- Addon Expiry: 7s - Regular monitoring
- Subscription Renewal: 8s - Strategic timing
- Compliance Audit: 15s - Batch processing

Adjust poll intervals based on:
- Business requirements
- System load
- Database query performance
- Notification volume

---

## Best Practices

1. **Always enqueue related jobs** - If expiry Worker detects expiry, enqueue grace period check
2. **Include context in payloads** - Pass all needed IDs to avoid additional lookups
3. **Implement idempotent operations** - Jobs may run multiple times
4. **Handle missing records gracefully** - Log and skip, don't fail
5. **Set appropriate priority levels** - Critical operations get higher priority
6. **Monitor worker lag** - Track job processing times
7. **Implement backoff strategies** - Retry failed jobs with increasing delays

---

## Troubleshooting

### Worker Crashes
Check logs:
```bash
pm2 logs worker-name
pm2 status
```

### High CPU Usage
- Reduce poll interval
- Optimize database queries
- Check for infinite loops in processors

### Database Connection Issues
- Verify MongoDB URI in .env
- Check connection pool settings
- Review network connectivity

### Job Queue Backup
- Monitor queue depth
- Increase worker count if needed
- Reduce poll intervals

---

## Future Enhancements

1. **Scheduled Tasks** - Integrate with node-cron for scheduled checks
2. **Batch Processing** - Process multiple jobs in batches
3. **Circuit Breaker** - Handle downstream service failures
4. **Metrics Export** - Export to Prometheus/Grafana
5. **Dead Letter Queue** - Better handling of permanent failures
6. **Worker Scaling** - Auto-scale workers based on load

