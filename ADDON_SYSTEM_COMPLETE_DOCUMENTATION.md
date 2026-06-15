# Comprehensive Addon System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Addon Types](#addon-types)
3. [Addon Model Structure](#addon-model-structure)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Workers](#backend-workers)
6. [Company Effective State](#company-effective-state)
7. [Complete Flow](#complete-flow)
8. [API Endpoints](#api-endpoints)

---

## Overview

The addon system allows companies to purchase additional **limits** (numeric increases) or **features** (permission/action bundles) to enhance their plan.

### Key Concepts

- **Types**: Limit-based or Feature-based addons
- **Billing**: One-time or Recurring (monthly)
- **Scope**: Global (available to all) or Company-specific
- **Expiry**: Duration-based, Plan-aligned, or Yearly
- **Effective State**: Computed limits and permissions after merging plan + active addons

---

## Addon Types

### 1. Limit Addon (📊 Numeric Limits)

Adds numeric capacity to a plan.

```json
{
  "type": "limit",
  "name": "Extra 10 Users",
  "provides": {
    "limits": {
      "max_employees": 10,
      "storage_mb": 1024
    }
  },
  "billingType": "onetime",
  "pricePaise": 10000  // ₹100
}
```

**Use Cases:**
- Buy 10 more user seats
- Add storage capacity
- Increase API call limits

---

### 2. Feature Addon (🔓 Permissions/Actions)

Unlocks specific module actions/permissions.

```json
{
  "type": "feature",
  "name": "Advanced Reporting Module",
  "provides": {
    "permissions": [
      "reporting.dashboard_show",
      "reporting.export_data",
      "reporting.schedule_reports"
    ]
  },
  "billingType": "recurring",
  "expiryType": "plan_end",
  "durationDays": 30,
  "pricePaise": 50000  // ₹500
}
```

**Use Cases:**
- Unlock advanced modules
- Enable premium features
- Grant specific action capabilities

---

## Addon Model Structure

### Database Schema

```javascript
{
  // Basic Info
  value: String,                    // Unique key (e.g., "extra_users_10")
  name: String,                     // Display name
  description: String,              // Long description
  
  // Type & Scope
  type: "limit" | "feature",
  scope: "global" | "company",
  companyId: ObjectId,              // If scope='company'
  
  // Provides (content varies by type)
  provides: {
    limits?: { [limitKey]: number },
    permissions?: [String]
  },
  
  // Billing & Expiry
  billingType: "onetime" | "recurring",
  expiryType: "duration" | "plan_end" | "yearly",  // if recurring
  durationDays: Number,             // if expiryType='duration'
  
  // Pricing & Tax
  pricePaise: Number,
  hasTax: Boolean,
  taxIncluded: Boolean,
  taxName: String,
  
  // Status
  isSystem: Boolean,
  isActive: Boolean,
  isDeleted: Boolean,
  
  // Metadata
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Frontend Implementation

### 1. Addon Creation (AddonForm.jsx)

**Features:**
- Type selection (Limit vs Feature)
- Scope selection (Global vs Company-specific)
- Conditional UI based on type:
  - **Limit Type**: Form to add named numeric limits
  - **Feature Type**: Checkbox list of module actions
- Billing type selection (One-time vs Recurring)
- Expiry type dropdown (Duration/Plan End/Yearly) for recurring
- Tax configuration
- Action selection management

**UI Sections:**
```
📋 Basic Info
├─ Name, Value (unique key), Description

🎯 Type & Scope
├─ Type selector (Limit/Feature)
├─ Scope selector (Global/Company)

📦 Limits (if type='limit')
├─ Add/Edit/Remove limit fields
├─ Examples: max_employees, storage_mb

🔐 Permissions (if type='feature')
├─ Module listing
├─ Action checkboxes per module
├─ Selected count badge

💰 Billing & Expiry
├─ Price input
├─ Billing type (One-time/Recurring)
├─ Expiry type (Duration/Plan End/Yearly)
├─ Duration days (if applicable)
├─ Tax configuration

✅ Status
└─ Active checkbox
```

### 2. Addon Selection (AddonsStep.jsx)

**Enhanced Features:**
- Addon cards now show type badge (📊 Limit | 🔓 Feature)
- Billing type badge (🔔 One-time | 🔄 Recurring)
- Quantity controls (increment/decrement)
- Real-time price calculation
- Summary card showing total addon cost

**Card Information:**
```
┌─────────────────────────┐
│ Addon Name         ✓    │  (Check if selected)
│ [📊 Limit] [🔔 One-time]│  (Type & Billing badges)
│                         │
│ ₹100 per unit           │  (Price)
│ Incl. GST                │  (Tax info)
│                         │
│ Qty: [-] [2] [+]        │  (Quantity controls)
│ Subtotal: ₹200          │  (Total for this addon)
└─────────────────────────┘
```

---

## Backend Workers

### 1. Pending Addon Applier Worker

**Location:** `src/saas/workers/subscription/pendingAddonApplier.worker.js`

**Purpose:**
- Process paid addon orders
- Compute company effective state
- Sync with 3rd party API

**Flow:**
```
1. Find all paid addon orders (status='paid')
2. For each order:
   a) Recompute company.effectiveUserLimits
   b) Recompute company.effectivePermissions
   c) Update company document
   d) Call 3rd party API via sync.service
3. Mark order as processed
```

**Functions:**
- `computeEffectiveUserLimits(company)`: Merge plan + addon limits
- `computeEffectivePermissions(company)`: Merge plan + addon permissions
- `processAddonOrder(order)`: Apply single addon order
- `runAddonApplierWorker()`: Main worker loop

**Schedule:** Every 5 minutes

---

### 2. Addon Expiry Worker

**Location:** `src/saas/workers/subscription/addonExpiry.worker.js`

**Purpose:**
- Find expired addons
- Remove expired addons from effective state
- Mark orders as expired
- Sync expiry with 3rd party API

**Expiry Logic:**
```
For each addon order:
  If billingType = 'onetime':
    → Never expires (skip)
  
  If billingType = 'recurring':
    If expiryType = 'duration':
      → Expires after (purchaseDate + durationDays)
    
    If expiryType = 'plan_end':
      → Expires when subscription.endAt is reached
    
    If expiryType = 'yearly':
      → Expires after (purchaseDate + 365 days)
```

**Flow:**
```
1. Find all active addon orders
2. Check expiry condition for each
3. For expired addons:
   a) Mark order.status = 'expired'
   b) Recompute company effective state (without expired addon)
   c) Update company document
   d) Call 3rd party API
```

**Functions:**
- `isAddonExpired(addon, order, subscription)`: Check if expired
- `recomputeEffectiveState(company)`: Rebuild state without expired addon
- `processExpiredAddon(addon, order, company)`: Handle expiry
- `runAddonExpiryWorker()`: Main worker loop

**Schedule:** Every 10 minutes

---

## Company Effective State

### Computed Fields

The `Company` model has two computed fields that merge plan + active addon capabilities:

```javascript
effectiveUserLimits: {
  "max_employees": 15,        // Plan: 10 + Addon: 5
  "storage_mb": 2048,         // Plan: 1024 + Addon: 1024
  "api_calls_daily": 5000
}

effectivePermissions: [
  "invoices.create",
  "invoices.read",
  "invoices.edit",
  "reporting.dashboard_show",  // From addon
  "reporting.export_data"      // From addon
]
```

### When Computed

1. **When addon is purchased**: After order becomes paid
   - `pendingAddonApplier` worker runs
   - Recomputes both fields
   - Updates company document

2. **When addon expires**: After expiry conditions met
   - `addonExpiry` worker runs
   - Recomputes without expired addon
   - Updates company document

3. **On demand**: Can be manually triggered
   - API endpoint for force-recompute
   - Useful for debugging/admin actions

### Usage

These fields are used throughout the system:

- **User limiting**: Check `effectiveUserLimits.max_employees` when adding users
- **Feature gating**: Check `effectivePermissions` before showing UI
- **Access control**: Verify action in `effectivePermissions` before execution
- **Billing**: Calculate charges based on active addons

---

## Complete Flow

### Scenario: Buy "Extra 10 Users" Addon

```
1. USER SIDE (AddonsStep.jsx)
   └─ User selects qty=1 for "Extra 10 Users" addon
   └─ Proceeds to payment
   
2. ORDER CREATION (CompanyPaymentStep.jsx)
   └─ Order created with:
      ├─ orderType: "SUBSCRIPTION_ADDON_PURCHASE"
      ├─ items: [{ type: "addon", itemId: addonId, qty: 1 }]
      ├─ status: "pending"
      
3. PAYMENT PROCESSING (Payment API)
   └─ User pays ₹100
   └─ Payment marked as "paid"
   └─ Order.status changes from "pending" → "paid"
   
4. PENDING ADDON APPLIER WORKER (Every 5 min)
   └─ Finds order with status='paid'
   └─ Current company limits: max_employees: 10
   └─ Addon provides: max_employees: 10
   └─ Computes: max_employees = 10 + 10 = 20
   └─ Updates company.effectiveUserLimits.max_employees = 20
   └─ Calls 3rd party API:
      {
        action: "addon_purchased",
        companyId: "abc123",
        effectiveUserLimits: { max_employees: 20 },
        timestamp: "2026-04-29T10:30:00Z"
      }
   
5. 3RD PARTY SYSTEM (e.g., ticket system)
   └─ Receives webhook payload
   └─ Updates their user seat limit to 20
   └─ Returns success response
   
6. ADDON ACTIVE
   └─ Company can now create 20 users (instead of 10)
   └─ "Extra 10 Users" addon active until expiry
```

### Scenario: Recurring Feature Addon Expires

```
1. ADDON PURCHASE (Same as above)
   └─ "Advanced Reporting" addon purchased
   └─ Recurring, duration-based, expires after 30 days
   
2. 30 DAYS LATER
   └─ Addon purchased on 2026-03-30
   └─ Current date: 2026-04-29 (29 days passed)
   └─ No action (within grace period)
   
3. AFTER 30 DAYS (2026-04-30)
   └─ Current date: 2026-04-30
   └─ Addon is expired
   
4. ADDON EXPIRY WORKER (Every 10 min, runs on 2026-04-30 10:05)
   └─ Finds addon order with status='paid'
   └─ Checks expiry: purchaseDate + 30 days = 2026-04-30
   └─ Current date 2026-04-30 > expiry date ✓ EXPIRED
   └─ Marks order.status = 'expired'
   └─ Recomputes company effective state:
      ├─ Plan permissions: reporting.basic_*
      ├─ Active addons: (none, this one expired)
      └─ Result: effectivePermissions excludes reporting.advanced_*
   └─ Updates company.effectivePermissions
   └─ Calls 3rd party API:
      {
        action: "addon_expired",
        companyId: "abc123",
        addonId: "xyz789",
        addonName: "Advanced Reporting",
        effectivePermissions: ["reporting.basic_dashboard"],
        timestamp: "2026-04-30T10:05:00Z"
      }
   
5. 3RD PARTY SYSTEM
   └─ Receives expiry webhook
   └─ Hides advanced reporting UI
   └─ Downgrades reporting access to basic tier
```

---

## API Endpoints

### Addon Management (Admin)

**GET** `/saas/addons`
- List all active addons
- Response: `{ addons: [{ _id, name, type, billingType, ... }] }`

**GET** `/saas/addons/:id`
- Get specific addon
- Response: `{ addon: { ... } }`

**POST** `/saas/addons`
- Create new addon
- Body: `{ name, value, type, billingType, expiryType, durationDays, provides, pricePaise, ... }`
- Response: `{ addon: { _id, ... } }`

**PUT** `/saas/addons/:id`
- Update addon
- Body: Same as POST
- Response: `{ addon: { ... } }`

**DELETE** `/saas/addons/:id`
- Delete addon (soft delete)
- Response: `{ success: true }`

### Addon Purchase

**POST** `/saas/addons/:companyId/buy`
- Purchase addon for company
- Body: `{ addonCode, units: 1, method: "wallet|razorpay" }`
- Response: `{ orderId, totalAmount, ... }`

### Company Effective State

**GET** `/saas/company/:companyId/effective-state`
- Get current effective user limits and permissions
- Response: `{ effectiveUserLimits: {...}, effectivePermissions: [...] }`

**POST** `/saas/company/:companyId/recompute-effective-state`
- Force recompute effective state
- Response: `{ effectiveUserLimits: {...}, effectivePermissions: [...] }`

### Addon History

**GET** `/saas/company/:companyId/addons`
- Get all addons applied to company (from orders)
- Response: `{ addons: [...], activeCount, expiredCount }`

---

## Key Implementation Details

### 1. No Permissions Stored in Addon

**Why?** Addon should be source-agnostic. Module permissions are the source of truth.

**Instead:**
- Store only action keys like `"module.action.key"`
- On effective state compute, verify action exists in Module
- Prevents addon-module mismatch

### 2. Effective State Recomputation

**When to recompute:**
- ✅ After addon purchase (paid order)
- ✅ After addon expiry (duration passed)
- ✅ After plan upgrade (new plan limits)
- ✅ Admin force-recompute
- ❌ NOT on every request (performance)

**Merge Strategy:**
```
effectiveUserLimits = planLimits + (addon1Limits + addon2Limits + ...)
effectivePermissions = [planPermissions...] + [addon1Permissions...] + [addon2Permissions...]
```

### 3. 3rd Party API Sync

**When to call:**
- After addon purchase (apply addon in 3rd party system)
- After addon expiry (remove addon capability)
- After plan upgrade (update effective state)

**Payload Structure:**
```javascript
{
  action: "addon_purchased" | "addon_expired" | "state_updated",
  companyId: String,
  addonId?: String,
  addonName?: String,
  effectiveUserLimits: Object,
  effectivePermissions: Array,
  timestamp: ISO8601 String
}
```

---

## Summary

| Component | Responsibility |
|-----------|-----------------|
| **AddonForm.jsx** | Create/edit addons with type-specific UI |
| **AddonsStep.jsx** | Display addons for purchase with type badges |
| **Addon.model** | Define addon structure (type, billing, expiry) |
| **Company.model** | Store effective state (limits, permissions) |
| **pendingAddonApplier.worker** | Apply purchased addons to effective state |
| **addonExpiry.worker** | Remove expired addons from effective state |
| **sync.service** | Send webhook payloads to 3rd party API |

---

## Testing Checklist

- [ ] Create limit addon, purchase it, check company.effectiveUserLimits updated
- [ ] Create feature addon with module actions, check company.effectivePermissions
- [ ] Verify pending addon applier worker runs and applies addon
- [ ] Test addon expiry: set 1-day duration, wait > 1 day, verify expiry worker marks as expired
- [ ] Check 3rd party API called with correct payload
- [ ] Verify recurring addon with plan_end expiry type expires on plan end date
- [ ] Test UI shows type and billing badges correctly
- [ ] Verify quantity works for limit addons (qty=3 means 3 of that addon)

