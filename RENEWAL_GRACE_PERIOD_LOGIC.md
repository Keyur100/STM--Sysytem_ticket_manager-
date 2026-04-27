# Subscription Renewal & Grace Period Logic 🔄

> **Status**: ✅ IMPLEMENTED  
> **File**: `support-backend/src/saas/workers/subscription/subscriptionExpiryWorker.js`  
> **Date**: April 25, 2026

---

## 📋 Overview

Updated **subscriptionExpiryWorker** to handle a critical business scenario:

**When a subscription expires BUT a paid renewal/reactivate order already exists**, the system should:
- ✅ Skip the grace period entirely
- ✅ Go directly to EXPIRED status
- ✅ Allow the activation worker to start the new subscription immediately
- ✅ Prevent service interruption for paid customers

---

## 🎯 Business Logic

### Scenario 1: Normal Expiry (No Paid Renewal)
```
Subscription expires at endAt
    ↓
Enter GRACE period (7 days default)
    ↓
Customer can reactivate/renew within grace
    ↓
If no reactivation → EXPIRED after grace period
```

### Scenario 2: Paid Renewal Exists (NEW LOGIC ⭐)
```
Subscription expires at endAt
    ↓
Check: Is there a PAID renewal/reactivate order?
    ↓
YES → Skip grace, go directly to EXPIRED
    ↓
Activation worker starts new subscription immediately
    ↓
✅ No service interruption!
```

---

## 💻 Implementation Details

### The Check
```javascript
// Query for paid renewal/reactivate order
const paidRenewalOrder = await orderModel.findOne({
  companyId: s.companyId,
  status: "paid",
  orderType: { $in: ["SUBSCRIPTION_RENEWAL", "SUBSCRIPTION_REACTIVATE"] }
}).lean();
```

### Decision Logic
```javascript
if (now <= graceEnd && !paidRenewalOrder) {
  // ENTER GRACE
  // Only if: (1) within grace window AND (2) NO paid renewal exists
  lifecycle: "GRACE"
} else {
  // EXPIRED
  // When: (1) past grace window OR (2) paid renewal exists
  status: "EXPIRED"
  lifecycle: "EXPIRED"
}
```

### Logging
```javascript
if (paidRenewalOrder) {
  console.log(`⚡ Paid renewal found! Skipping grace period...`);
  console.log(`   Order: ${paidRenewalOrder._id} | Will activate immediately`);
} else {
  console.log(`✅ Grace period expired. Marking as EXPIRED...`);
}
```

---

## 📊 Order Types Recognized

The worker checks for these orderTypes:
- ✅ `SUBSCRIPTION_RENEWAL` - Customer renewed subscription
- ✅ `SUBSCRIPTION_REACTIVATE` - Customer reactivated suspended/expired subscription

---

## 🔄 Complete Workflow

### Step 1: Find Expired Subscriptions
```javascript
// ACTIVE subscriptions past endAt
db.subscriptions.find({ status: "ACTIVE", endAt: { $lte: now } })

// OR Grace subscriptions past grace period
db.subscriptions.find({ lifecycle: "GRACE", graceEndAt: { $lte: now } })
```

### Step 2: Check for Paid Renewal
```javascript
const paidRenewalOrder = await orderModel.findOne({
  companyId: s.companyId,
  status: "paid",
  orderType: { $in: ["SUBSCRIPTION_RENEWAL", "SUBSCRIPTION_REACTIVATE"] }
})
```

### Step 3: Transition Status
```javascript
// If paid renewal exists → EXPIRED immediately (skip grace)
// If no paid renewal and within grace → GRACE
// If no paid renewal and past grace → EXPIRED
```

### Step 4: On EXPIRED Status
1. Reset company limits to fallback
2. Clear selected addons
3. Remove activeSubscriptionId
4. Send SUBSCRIPTION_EXPIRED notification
5. Company status set to "expired"

### Step 5: Activation Worker Takes Over
- New subscription activation at intendedStartAt
- No service interruption
- ✅ Seamless renewal experience

---

## 📈 Benefits

| Benefit | Description |
|---------|-------------|
| **Zero Downtime** | Paid customers get immediate activation |
| **Better UX** | No service interruption for renewals |
| **Smooth Transition** | Old subscription → New subscription seamlessly |
| **Reduced Support** | Fewer "Why is my subscription disabled?" tickets |
| **Clear Logic** | Easy to understand and maintain |

---

## 🔍 Example Scenarios

### Scenario A: Customer Pays Renewal in Advance
```
Apr 20: Subscription expires (endAt = Apr 20)
Apr 19: Customer places paid RENEWAL order
Apr 20 Worker runs:
  ✓ Finds paid renewal order
  ✓ Sets status to EXPIRED (skips grace)
  ✓ Old subscription ready for transition
  ✓ New subscription activates immediately
Result: ✅ No downtime
```

### Scenario B: Customer Doesn't Renew
```
Apr 20: Subscription expires (endAt = Apr 20)
Apr 20 Worker runs:
  ✓ No paid renewal order found
  ✓ Sets lifecycle to GRACE (7 days)
  ✓ Company can still reactivate until Apr 27
Result: ✅ 7-day grace period activated
```

### Scenario C: Grace Period Expires
```
Apr 20: Subscription expires
Apr 20-27: In GRACE period
Apr 27: Grace expires (graceEndAt = Apr 27)
Apr 27 Worker runs:
  ✓ Grace period past graceEndAt
  ✓ Sets status to EXPIRED
  ✓ Company limits reset
Result: ✅ Subscription fully expired
```

---

## 🛠️ Code Changes

### File Modified
- `support-backend/src/saas/workers/subscription/subscriptionExpiryWorker.js`

### Changes Made
1. ✅ Added orderModel import (already had it)
2. ✅ Added paid renewal check at start of processing loop
3. ✅ Updated grace period condition with `!paidRenewalOrder` check
4. ✅ Added logging for paid renewal case
5. ✅ Added comprehensive documentation comments

### Key Addition
```javascript
// NEW: Check for paid renewal
const paidRenewalOrder = await orderModel.findOne({
  companyId: s.companyId,
  status: "paid",
  orderType: { $in: ["SUBSCRIPTION_RENEWAL", "SUBSCRIPTION_REACTIVATE"] }
}).lean();

// MODIFIED: Grace condition now includes renewal check
if (now <= graceEnd && !paidRenewalOrder) { ... }
```

---

## 📝 Worker Flow Diagram

```
START: subscriptionExpiryWorker
    ↓
Find expired subscriptions (status=ACTIVE, endAt<=now)
    ↓
For each expired subscription:
    ↓
    ├─ Check: Paid RENEWAL/REACTIVATE order exists?
    │   │
    │   ├─ YES ──→ Set status=EXPIRED (skip grace)
    │   │        └─ Log: "⚡ Paid renewal found!"
    │   │
    │   └─ NO ───→ Within grace window?
    │            │
    │            ├─ YES ──→ Set lifecycle=GRACE
    │            │
    │            └─ NO ───→ Set status=EXPIRED
    │
    ├─ Reset company limits
    ├─ Clear addons
    ├─ Send notification
    └─ Next subscription...
    ↓
END: Report completion
```

---

## 🚀 Testing

### Test Case 1: Paid Renewal Skips Grace
```javascript
// Create subscription with endAt = now
// Create paid RENEWAL order for same company
// Run worker
// Assert: subscription.status === "EXPIRED" (not "GRACE")
```

### Test Case 2: No Renewal Enters Grace
```javascript
// Create subscription with endAt = now
// No renewal order
// Run worker
// Assert: subscription.lifecycle === "GRACE"
```

### Test Case 3: Grace Period Expires
```javascript
// Create subscription in GRACE
// Set graceEndAt = past
// Run worker
// Assert: subscription.status === "EXPIRED"
```

---

## ✅ Verification

Run these commands to verify:

```bash
# Check worker logs
pm2 logs saas-subscription-expiry-worker

# Look for these messages:
# ✅ "Entered grace period"
# ⚡ "Paid renewal found! Skipping grace period"
# ✅ "Grace period expired"
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| subscriptionExpiryWorker.js | Handles expiry (this file) |
| subscriptionActivationWorker.js | Handles activation |
| subscriptionGraceReactivationWorker.js | Handles grace period decisions |
| order.model.js | Order schema with orderType field |
| subscription.model.js | Subscription schema |

---

## 🎓 Key Takeaways

1. **Paid renewals bypass grace period** → Better UX
2. **Check for paid orders during expiry** → Optimization
3. **Log the decision** → Easy debugging
4. **Reset limits only on true EXPIRED** → Data consistency
5. **Activation worker handles the rest** → Clean separation

---

## 🔗 Related Documentation

- [subscriptionExpiryWorker.js](support-backend/src/saas/workers/subscription/subscriptionExpiryWorker.js)
- [WORKERS_PM2_GUIDE.md](WORKERS_PM2_GUIDE.md)
- [WORKERS_COMPLETE_INDEX.md](WORKERS_COMPLETE_INDEX.md)

---

**Status**: ✅ IMPLEMENTED & DOCUMENTED  
**Version**: 1.0  
**Last Updated**: April 25, 2026
