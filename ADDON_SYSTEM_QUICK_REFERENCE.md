# Addon System - Quick Reference Guide

## Quick Facts

✅ **Addon Types:**
- `limit`: Numeric capacity (users, storage, API calls)
- `feature`: Permission/action bundles (module access)

✅ **Billing Types:**
- `onetime`: One-time purchase, no expiry
- `recurring`: Monthly subscription with expiry options

✅ **Expiry Types (for recurring):**
- `duration`: Expires after N days (default 30)
- `plan_end`: Expires when plan expires
- `yearly`: Expires after 365 days

✅ **Scopes:**
- `global`: Available to all companies
- `company`: Company-specific addon

---

## Creating Addons

### Limit Addon Example
```json
{
  "name": "Extra 50 Users",
  "value": "extra_users_50",
  "type": "limit",
  "scope": "global",
  "billingType": "onetime",
  "pricePaise": 50000,
  "provides": {
    "limits": {
      "max_employees": 50
    }
  },
  "hasTax": true,
  "taxIncluded": true,
  "taxName": "GST"
}
```

### Feature Addon Example
```json
{
  "name": "Advanced Analytics",
  "value": "advanced_analytics",
  "type": "feature",
  "scope": "global",
  "billingType": "recurring",
  "expiryType": "plan_end",
  "durationDays": null,
  "pricePaise": 100000,
  "provides": {
    "permissions": [
      "analytics.custom_reports",
      "analytics.data_export",
      "analytics.scheduled_reports"
    ]
  }
}
```

---

## Frontend Workflow

### 1. Create Addon (Admin)
```
Go to: /addons/create
├─ Select Type (Limit/Feature)
├─ If Limit:
│  └─ Add numeric limits (max_employees, storage_mb)
├─ If Feature:
│  └─ Select module actions (checkboxes)
├─ Set billing type (One-time/Recurring)
├─ If Recurring: select expiry type
├─ Enter price, tax info
└─ Save
```

### 2. Purchase Addon (Customer)
```
Go to: Company Form → AddonsStep
├─ View addon cards
├─ See type badge (📊 Limit | 🔓 Feature)
├─ See billing badge (🔔 One-time | 🔄 Recurring)
├─ Set quantity (for limit addons, qty means multiple purchases)
├─ Proceed to payment
└─ Order created
```

---

## Backend Workflow

### When Addon is Purchased
```
1. Order created with status='pending'
2. Payment processed
3. Order.status → 'paid'
4. Every 5 min, pendingAddonApplier worker runs:
   ├─ Finds all paid addon orders
   ├─ Recomputes company.effectiveUserLimits
   ├─ Recomputes company.effectivePermissions
   ├─ Updates company document
   └─ Calls 3rd party API webhook
```

### When Addon Expires
```
1. Check expiry condition (billingType='recurring' only)
2. Every 10 min, addonExpiry worker runs:
   ├─ Finds expired addons
   ├─ Marks order.status → 'expired'
   ├─ Recomputes effective state without addon
   ├─ Updates company document
   └─ Calls 3rd party API webhook
```

---

## Key Database Fields

### Addon Collection
```javascript
addon = {
  _id: ObjectId,
  value: "extra_users_10",           // Unique key
  name: "Extra 10 Users",             // Display name
  type: "limit" | "feature",          // Type
  scope: "global" | "company",        // Scope
  billingType: "onetime" | "recurring",
  expiryType: "duration" | "plan_end" | "yearly",  // if recurring
  durationDays: 30,                   // if expiryType='duration'
  provides: {                         // Type-specific data
    limits: { max_employees: 10 },    // if type='limit'
    permissions: ["module.action"]    // if type='feature'
  },
  pricePaise: 10000,
  hasTax: true,
  taxIncluded: true,
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

### Company Collection (NEW FIELDS)
```javascript
company = {
  _id: ObjectId,
  // ... other fields
  effectiveUserLimits: {              // COMPUTED
    max_employees: 20,                // plan(10) + addon(10)
    storage_mb: 2048
  },
  effectivePermissions: [             // COMPUTED
    "invoices.create",
    "analytics.dashboard",
    "analytics.export"
  ]
}
```

### Order Collection
```javascript
order = {
  _id: ObjectId,
  orderType: "SUBSCRIPTION_ADDON_PURCHASE",
  companyId: ObjectId,
  status: "pending" | "paid" | "expired" | "failed",
  items: [{
    type: "addon",
    itemId: addonId,
    qty: 1
  }],
  totalAmountPaise: 10000,
  createdAt: Date,
  expiredAt: Date   // when status='expired'
}
```

---

## API Reference

```
GET    /saas/addons                          → List addons
GET    /saas/addons/:id                      → Get addon
POST   /saas/addons                          → Create addon
PUT    /saas/addons/:id                      → Update addon
DELETE /saas/addons/:id                      → Delete addon

GET    /saas/company/:id/addons              → Get company addons
GET    /saas/company/:id/effective-state     → Get effective limits/permissions
POST   /saas/company/:id/recompute-effective-state  → Force recompute
```

---

## Workers

### Pending Addon Applier
```
File: src/saas/workers/subscription/pendingAddonApplier.worker.js
Schedule: Every 5 minutes
Does: Apply paid addons to effective state + 3rd party sync
```

### Addon Expiry
```
File: src/saas/workers/subscription/addonExpiry.worker.js
Schedule: Every 10 minutes
Does: Check expiry + remove expired addons from effective state + 3rd party sync
```

---

## Common Tasks

### Check if User Can Do Action
```javascript
// Frontend
const canExportData = company.effectivePermissions?.includes('analytics.export');
if (canExportData) showExportButton();

// Backend
const canExport = company.effectivePermissions?.includes('analytics.export');
if (!canExport) return res.status(403).json({ error: 'Permission denied' });
```

### Check User Limits
```javascript
// Backend - Before adding 11th user
const company = await Company.findById(companyId);
const maxEmployees = company.effectiveUserLimits?.max_employees || 0;
const currentUsers = await User.countDocuments({ companyId });

if (currentUsers >= maxEmployees) {
  return res.status(402).json({ error: 'User limit reached, upgrade addon' });
}
```

### Recompute Effective State
```javascript
// Manually trigger recompute
POST /saas/company/:companyId/recompute-effective-state

// Response
{
  "effectiveUserLimits": { "max_employees": 20 },
  "effectivePermissions": ["module.action1", "module.action2"]
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Addon not applied after purchase | Check if pendingAddonApplier worker is running, check PM2 logs |
| effectiveUserLimits not updating | Check company ID in addon order, verify addon provides.limits |
| Old addon still active after expiry | Check if addonExpiry worker is running, verify expiryType config |
| 3rd party API not receiving webhook | Check sync.service.js logs, verify security_key in headers |
| Module actions not showing in addon form | Check Module collection has actions array with "key" field |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ADDON SYSTEM FLOW                         │
└─────────────────────────────────────────────────────────────┘

Frontend (UI)
  ↓
  ├─→ AddonForm.jsx (Create addon with type-specific UI)
  ├─→ AddonsStep.jsx (Purchase addon with quantity)
  └─→ Company.effectiveState (Display active features)

Backend (API)
  ↓
  ├─→ addon.controller.js (CRUD operations)
  ├─→ addon.service.js (Business logic)
  └─→ addon.route.js (Route handlers)

Database
  ↓
  ├─→ Addon collection (Template)
  ├─→ Order collection (Purchase history)
  └─→ Company collection (Effective state)

Workers (Async)
  ↓
  ├─→ pendingAddonApplier.worker.js (Every 5 min)
  │   └─→ Apply paid addons to company.effective*
  │
  └─→ addonExpiry.worker.js (Every 10 min)
      └─→ Remove expired addons from company.effective*

3rd Party Systems
  ↓
  └─→ Receive webhooks via sync.service.js
      ├─ addon_purchased
      ├─ addon_expired
      └─ state_updated
```

---

## Permissions (RBAC)

```
addon_read              → View addons
addon_create            → Create new addon
addon_update            → Update addon
addon_delete            → Delete addon
addon_buy               → Purchase addon
company_view_effective_state → See effective limits/permissions
```

