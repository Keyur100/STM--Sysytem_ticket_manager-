# Complete Addon & Coupon Workflow

## Overview
This document describes the complete workflow for selecting add-ons and applying plan-specific coupons during company signup.

---

## 1. Form Stepper Flow (4 Steps)

### Step 0: Company & Contact Details
- Create draft company in database
- Store: name, url, panNo, gstNo, contact info
- Initialize `selectedAddons: {}`

### Step 1: Plan Settings
- Select a plan
- Plan object includes: `planGroup` field (e.g., "BASIC", "PROFESSIONAL")
- Store plan with all details

### Step 2: Add-ons Selection
- Display available add-ons (fetched from `/saas/addons`)
- User selects quantity for each add-on
- Store as: `selectedAddons: { max_employees: 2, storageMB: 5 }`
- On Next: Save to database with `selectedAddons` field

### Step 3: Payment Summary
- Calculate: Plan Price + Add-ons Total = Subtotal
- Apply coupons (filtered by planGroup)
- Confirm payment

---

## 2. Add-ons Data Structure

### Frontend (AddonsStep.jsx)
```javascript
form.selectedAddons = {
  "max_employees": 2,      // value field + quantity
  "max_branch": 1,
  "storageMB": 5
}
```

### Backend Addon Model
```javascript
{
  value: "max_employees",           // unique identifier (not _id)
  name: "Extra Employees",
  description: "Add additional employees",
  pricePaise: 49900,               // ₹499
  hasTax: true,
  taxName: "GST",
  isActive: true,
  isDeleted: false
}
```

---

## 3. Coupon Filtering by PlanGroup

### Before (Global Coupons Only)
- API: `/saas/coupons/company/:companyId`
- Result: All coupons regardless of plan

### After (Plan-Specific Coupons)
- API: `/saas/coupons/company/:companyId?planGroup=BASIC`
- Result: Only coupons applicable to selected plan group

### Data Flow
1. **Frontend**: `form.plan.planGroup` (from Step 1)
2. **CouponModal**: Receives `planGroup` prop
3. **API Call**: Appends `?planGroup=value` to query
4. **Backend Controller**: Extracts from `req.query.planGroup`
5. **Service**: Filters coupons by `eligiblePlanGroups`

---

## 4. Debugging Console Logs

### Payment Step Form Update
```
=== PAYMENT STEP FORM DEBUG ===
Form: {
  _id: "...",
  selectedAddons: { max_employees: 2, storageMB: 5 },
  plan: { name: "Basic", code: "BASIC_001", planGroup: "BASIC" }
}
============================
```

### Addon Calculation
```
=== ADDON CALCULATION DEBUG ===
form.selectedAddons: { max_employees: 2, storageMB: 5 }
addonsData: [ { value: "max_employees", pricePaise: 49900 }, ... ]
Processing addon value: max_employees, qty: 2
Found addon: { value: "max_employees", pricePaise: 49900, ... }
Added to total: 99.8
Final addons total: 199.8
===========================
```

### Coupon Fetching
```
Fetching coupons with planGroup: BASIC
CouponController.getAll - planGroup: BASIC
CouponService.getAll called with planGroup: BASIC
Global coupons found: 3
Company coupons found: 2
```

---

## 5. Database Models

### Coupon Model (Updated)
```javascript
{
  code: "SAVE20",
  description: "Save 20% on select plans",
  eligiblePlanCodes: ["BASIC_001", "PRO_001"],     // specific plans
  eligiblePlanGroups: ["BASIC", "PROFESSIONAL"],  // NEW: plan groups
  appliesTo: "PLAN",
  discountType: "PERCENT",
  discountValue: 20,
  validFrom: 1700000000,
  validTo: 1710000000,
  isActive: true
}
```

### Company Model
```javascript
{
  name: "Company Name",
  plan: { ... },
  selectedAddons: {                    // NEW field
    "max_employees": 2,
    "storageMB": 5
  },
  contact: { ... }
}
```

---

## 6. API Endpoints

### Get Add-ons
- **GET** `/saas/addons`
- **Response**: `{ success: true, addons: [...], count: 6 }`
- **Fields**: value, name, description, pricePaise, hasTax, taxName

### Get Coupons (Plan-Specific)
- **GET** `/saas/coupons/company/:companyId?planGroup=BASIC`
- **Response**: `{ globalCoupons: [...], companyCoupons: [...] }`
- **Filters**: By planGroup if provided

### Apply Coupon
- **POST** `/saas/coupons/apply`
- **Body**: `{ code, planCode, amountPaise }`
- **Note**: Already validates against `eligiblePlanCodes`

---

## 7. Price Calculation

### Frontend Calculation (CompanyPaymentStep.jsx)
```javascript
const planPrice = (plan?.pricePaise || 0) / 100;        // ₹X
const addonsTotal = calculateAddonsTotal();              // ₹Y
const subtotal = planPrice + addonsTotal;               // ₹X + ₹Y
const totalAfterDiscount = subtotal - discountAmount;   // with coupon
const finalPayable = totalAfterDiscount - walletUsed;   // final amount
```

### Display in UI
```
Plan Price (Basic):           ₹499.00
Add-ons Total:                ₹199.80  ← Now shows addon price
────────────────────────────────────
Subtotal:                     ₹698.80
Discount (Coupon):            -₹69.88
────────────────────────────────────
Final Payable:                ₹628.92
```

---

## 8. Workflow Summary

```
Step 0: Company & Contact
        ↓
Step 1: Plan Selection (stores planGroup)
        ↓
Step 2: Add-ons Selection (stores selectedAddons)
        ↓
Step 3: Payment
        ├── Load addons data
        ├── Calculate addon total
        ├── Apply coupon (filtered by planGroup)
        ├── Display: Plan + Addons = Subtotal
        └── Process payment

```

---

## 9. Testing Checklist

- [ ] Select add-ons on Step 2 with quantities
- [ ] Verify `selectedAddons` logs show correct values
- [ ] Navigate to Step 3 (Payment)
- [ ] Confirm `selectedAddons` is not empty in form
- [ ] Verify addon total displays correctly
- [ ] Check coupon API called with `?planGroup=` parameter
- [ ] Verify only plan-specific coupons appear
- [ ] Apply coupon and verify discount calculation
- [ ] Check final payable = plan + addons - discount
- [ ] Process payment successfully

---

## 10. Common Issues & Fixes

### Issue: selectedAddons is empty on payment page
**Cause**: Not being saved when moving to next step
**Fix**: Check that `handleNext()` in index.jsx calls `updateCompany()` with `selectedAddons`

### Issue: Addon price shows 0
**Cause**: addonsData not loaded or value doesn't match
**Fix**: Check console logs for "Found addon: undefined"

### Issue: All coupons showing instead of plan-specific
**Cause**: planGroup not passed to API
**Fix**: Verify CouponModal receives `planGroup` prop and appends to URL

### Issue: Coupon API 400 error
**Cause**: Invalid planGroup format
**Fix**: Ensure planGroup matches exactly with coupon's `eligiblePlanGroups` array

