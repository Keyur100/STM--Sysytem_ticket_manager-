# Addon Debug Guide - Frontend to Backend Verification

## Problem
Addon IDs sent from frontend are coming as `null` in backend when trying to find them: `addonModel.findById(a.addonId)` returns null.

## Solution - Step by Step Verification

### 1️⃣ FRONTEND - Verify Addon Data is Fetched
**File**: `CompanyPaymentStep.jsx`

When the component loads, check browser DevTools Console:

```javascript
✅ Built addons array: [
  { addonId: "507f1f77bcf86cd799439011", qty: 2 },
  { addonId: "507f1f77bcf86cd799439012", qty: 1 }
]
```

**If you see warnings like:**
```
⚠️ Addon not found in addonsData - value: "storage_addon"
available addons: [...]
```

→ This means the addon value doesn't match. Check AddonsStep to verify addon values are correct.

---

### 2️⃣ BACKEND - Verify Addons Received
**File**: `company.service.js` → `signupOrUpdateCompany()` method

Check your backend logs when payment is submitted:

```
📦 Incoming payload addons: [
  { addonId: "507f1f77bcf86cd799439011", qty: 2 }
]
📋 Addon IDs to find: ["507f1f77bcf86cd799439011"]
```

**If addons array is empty `[]`:**
→ Frontend is not sending addons. Check payload in `handleConfirmAndPay()`

**If addons array has items but IDs are wrong/invalid:**
→ Check if `addon._id` is being sent correctly from frontend

---

### 3️⃣ VERIFY ADDONS EXIST IN DATABASE

Run this in MongoDB shell or mongoDB compass:

```javascript
// List all addons
db.addons.find({}).pretty()

// Check if specific addon exists
db.addons.findById("507f1f77bcf86cd799439011")

// Count total addons
db.addons.countDocuments()
```

**Expected Output:**
```javascript
[
  {
    "_id": ObjectId("507f1f77bcf86cd799439011"),
    "value": "storage_addon",
    "name": "Storage Add-on",
    "pricePaise": 10000,
    "description": "..."
  },
  {
    "_id": ObjectId("507f1f77bcf86cd799439012"),
    "value": "support_addon",
    "name": "Support Add-on",
    "pricePaise": 5000,
    "description": "..."
  }
]
```

**If NO addons exist:**
→ Need to seed addons data to database

---

### 4️⃣ COMMON ISSUES & FIXES

| Issue | Cause | Solution |
|-------|-------|----------|
| `addon is null` | Addon ID doesn't exist in DB | Verify addon exists in MongoDB |
| Empty addons array | Frontend not sending addons | Check `buildAddonsArray()` output |
| Wrong addon IDs | addon._id is different from what frontend has | Verify addon object structure in `GET /saas/addons` |
| Data mismatch | addon.value in frontend doesn't match DB | Ensure addon values are consistent |

---

### 5️⃣ DEBUGGING CHECKLIST

- [ ] **Frontend Console**: See `✅ Built addons array` with proper IDs?
- [ ] **Backend Logs**: See `📦 Incoming payload addons` with correct IDs?
- [ ] **Database**: Run `db.addons.find({})` - any results?
- [ ] **Addon API**: Test `GET /saas/addons` - returns addon data with `_id`?
- [ ] **Value Match**: Do addon.value in frontend match DB values?

---

### 6️⃣ TEST DATA

If database is empty, seed addons:

```javascript
// /support-backend/src/saas/seed/initialData.js

const addons = [
  {
    value: "storage_addon",
    name: "Extra Storage",
    description: "100GB additional storage",
    pricePaise: 50000,  // ₹500
    hasTax: true,
    taxName: "GST"
  },
  {
    value: "support_addon",
    name: "Priority Support",
    description: "24/7 priority email support",
    pricePaise: 30000,  // ₹300
    hasTax: true,
    taxName: "GST"
  }
];

// Then run: npm run seed
```

---

### 7️⃣ FINAL VERIFICATION TEST

1. Open browser → CompanyPaymentStep
2. Verify "✅ Built addons array" in console
3. Click "Confirm & Pay"
4. Check backend logs for "📦 Incoming payload addons"
5. Verify no "❌ Invalid addons detected" warnings
6. If error: check MongoDB for addon IDs

---

## Summary

**Frontend sends**: `[{ addonId: "...", qty: 2 }]`
↓
**Backend receives**: `addons = [{ addonId: "...", qty: 2 }]`
↓
**Backend queries**: `addonModel.findById("...")`
↓
**Result**: Should find addon or show clear error

If finding `null`, addon doesn't exist in DB.
