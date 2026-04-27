# PM2 Workers - Quick Reference Card

## 🚀 START WORKERS (Pick One)

### Option 1: PM2 Direct
```bash
cd support-backend
pm2 start pm2.worker.config.js
```

### Option 2: Batch Script (Windows)
```batch
cd support-backend
start-workers.bat start
```

### Option 3: PowerShell (Windows)
```powershell
.\manage-workers.ps1 start-all
```

---

## 📋 COMMON COMMANDS

| Command | Result |
|---------|--------|
| `pm2 list` | Show all processes |
| `pm2 logs` | View all logs |
| `pm2 logs [name]` | View worker logs |
| `pm2 monit` | Real-time monitor (Ctrl+C exit) |
| `pm2 stop all` | Stop all workers |
| `pm2 restart all` | Restart all workers |
| `pm2 delete all` | Delete all workers |
| `pm2 info [name]` | Worker details |
| `pm2 flush` | Clear logs |
| `pm2 kill` | Kill PM2 daemon |

---

## 🎯 14 WORKERS

| # | Worker | Purpose |
|---|--------|---------|
| 1 | saas-subscription-expiry-worker | Expire subscriptions |
| 2 | saas-subscription-grace-reactivation-worker | Grace period logic |
| 3 | saas-subscription-reminder-worker | Send reminders |
| 4 | saas-addon-expiry-worker | Expire addons |
| 5 | saas-pending-addon-applier-worker | Apply addons |
| 6 | saas-trial-expiry-worker | Expire trials |
| 7 | saas-billing-worker | Process billing |
| 8 | saas-payment-reconciliation-worker | Reconcile payments |
| 9 | saas-proration-worker | Proration calc |
| 10 | saas-usage-quota-enforcement-worker | Enforce quotas |
| 11 | saas-wallet-deduction-worker | Wallet deduct |
| 12 | saas-notification-worker | Send notifications |
| 13 | saas-hard-delete-worker | Hard delete data |
| 14 | saas-health-worker | Health checks |

---

## 📊 DATABASE QUERIES

### Count by Status
```javascript
db.subscriptions.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])
```

### Get Active
```javascript
db.subscriptions.find({ status: 'ACTIVE' })
```

### Get Expiring (7 days)
```javascript
const now = Date.now();
const in7Days = now + (7 * 24 * 60 * 60 * 1000);
db.subscriptions.find({
  status: 'ACTIVE',
  endAt: { $gte: now, $lte: in7Days }
})
```

### Get Grace Period
```javascript
db.subscriptions.find({ lifecycle: 'GRACE' })
```

### Get Company
```javascript
db.subscriptions.findOne({
  companyId: ObjectId('COMPANY_ID'),
  status: 'ACTIVE'
})
```

---

## 📁 DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| WORKERS_QUICK_START.md | Quick reference |
| WORKERS_PM2_GUIDE.md | Comprehensive guide |
| WORKERS_SETUP_SUMMARY.md | Overview |
| WORKERS_COMPLETE_INDEX.md | Master index |
| support-backend/WORKERS_README.md | Backend guide |

---

## 🛠️ HELPER SCRIPTS

### PowerShell: manage-workers.ps1
```powershell
.\manage-workers.ps1 start-all
.\manage-workers.ps1 stop-all
.\manage-workers.ps1 restart-all
.\manage-workers.ps1 status
.\manage-workers.ps1 logs
.\manage-workers.ps1 monit
```

### PowerShell: check-subscription-status.ps1
```powershell
.\check-subscription-status.ps1 help
.\check-subscription-status.ps1 stats
.\check-subscription-status.ps1 expiry
```

### Batch: start-workers.bat
```batch
start-workers.bat start
start-workers.bat stop
start-workers.bat restart
start-workers.bat logs
start-workers.bat status
```

---

## ✅ STATUS VALUES

| Status | Meaning |
|--------|---------|
| ACTIVE | Currently active |
| EXPIRED | Has expired |
| SUSPENDED | Manually suspended |
| GRACE | In grace period |

---

## 🔍 TROUBLESHOOTING

### Workers won't start
```bash
pm2 logs                           # Check errors
pm2 kill && pm2 start pm2.worker.config.js  # Restart
```

### Can't see logs
```bash
pm2 flush                          # Clear logs
pm2 logs --lines 100               # View recent
```

### High memory usage
```bash
pm2 monit                          # Monitor
pm2 restart [worker-name]          # Restart
```

---

## 🚀 QUICK START (Copy & Paste)

```bash
# 1. Start
cd support-backend
pm2 start pm2.worker.config.js

# 2. Check
pm2 list

# 3. View logs
pm2 logs

# 4. Monitor
pm2 monit

# 5. Save
pm2 save
```

---

## 📞 NEED HELP?

- Read: `WORKERS_QUICK_START.md`
- Full guide: `WORKERS_PM2_GUIDE.md`
- Scripts: `manage-workers.ps1`
- Queries: `check-subscription-status.ps1`
- Index: `WORKERS_COMPLETE_INDEX.md`

---

**Status**: ✅ Ready to Use  
**Version**: 1.0  
**Last Updated**: April 24, 2026
