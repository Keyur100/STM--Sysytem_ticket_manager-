# Plan Prefilling Implementation - Complete Guide

## Overview
Implemented automatic saving and pre-filling of selected plan data when creating/editing companies. The plan is now saved as `planSnapshot` in the company schema and properly restored when editing.

---

## How It Works

### 1. **Plan Selection & Saving Flow**

```
Company Form Stepper (index.jsx)
         ↓
User selects Plan in PlanSettingsStep
         ↓
handleSelectPlan() called
         ↓
Creates planSnapshot with:
  - Plan ID
  - Price (can be modified)
  - Duration (can be modified)
  - Module Permissions (normalized)
  - Other plan details
         ↓
form.plan = planSnapshot
         ↓
User clicks NEXT
         ↓
handleNext() in index.jsx
         ↓
dispatch(updateCompany({
  id: form._id,
  data: {
    ...other fields,
    plan: form.plan,  // <-- Entire planSnapshot
    ...
  }
}))
         ↓
Backend updateCompany()
         ↓
Maps 'plan' → 'planSnapshot'
         ↓
Saves to MongoDB:
  company.planSnapshot = form.plan
```

### 2. **Editing Company & Pre-filling Flow**

```
User clicks Edit on Company
         ↓
Frontend fetches company details
         ↓
companyDetails.planSnapshot is returned
         ↓
index.jsx prefills form:
  plan: companyDetails.planSnapshot || null
         ↓
PlanSettingsStep receives form.plan
         ↓
Plans list is fetched
         ↓
useEffect checks if form.plan._id matches any fetched plan
         ↓
If matched:
  - setSelectedPlan(plan) - highlights plan in sidebar
  - Preserves form.plan with saved customizations
         ↓
User sees:
  - Plan selected in sidebar
  - Price/Duration from when it was saved
  - Module Permissions from when it was saved
  - All customizations preserved!
```

---

## Files Modified

### 1. **Backend Service** (`support-backend/src/saas/services/company.service.js`)

**Change:** Updated `updateCompany()` function to properly map field names

```javascript
// BEFORE: Saved as 'plan' field (incorrect schema field name)
const company = await Company.findByIdAndUpdate(companyId, { $set: { ...payload, updatedBy } });

// AFTER: Maps 'plan' to 'planSnapshot' + removes transient fields
const updateData = { ...payload, updatedBy };

// Map frontend field names to schema field names
if (updateData.plan && !updateData.planSnapshot) {
  updateData.planSnapshot = updateData.plan;
  delete updateData.plan;
}

// Remove transient field
if (updateData.effectivePermissions) {
  delete updateData.effectivePermissions;
}

const company = await Company.findByIdAndUpdate(
  companyId,
  { $set: updateData },
  { new: true, runValidators: true }
);
```

**Why:** 
- MongoDB schema field is `planSnapshot`, not `plan`
- `effectivePermissions` is computed from `planSnapshot`, shouldn't be persisted
- Ensures data consistency

---

### 2. **Frontend Form Stepper** (`support-frontend/src/pages/saas/company/CompanyFormStepper/index.jsx`)

**Change:** Fixed prefilling to use correct field name

```javascript
// BEFORE: Tried to handle both 'plan' and 'planSnapshot' (confusing logic)
plan: (companyDetails.plan && (companyDetails.plan.planSnapshot || companyDetails.plan)) || null,

// AFTER: Directly use 'planSnapshot' from backend
plan: companyDetails.planSnapshot || null,
```

**Why:**
- Backend now always stores as `planSnapshot`
- Clearer and more maintainable code
- Form is prefilled with the exact saved plan data

---

### 3. **Plan Settings Step** (Already Working)

`support-frontend/src/pages/saas/company/CompanyFormStepper/PlanSettingsStep.jsx`

**How Prefilling Works:**

1. **Fetch Plans**
   - `fetchPlans()` - Gets list of all active plans

2. **Match Saved Plan**
   ```javascript
   if (form.plan && form.plan._id) {
     const found = plans.find((p) => String(p._id) === String(form.plan._id));
     if (found) setSelectedPlan(found);  // Highlights in sidebar
     return;
   }
   ```
   - Compares `form.plan._id` with fetched plans
   - If match found, highlights that plan in the sidebar

3. **Preserve Customizations**
   - `checkPlanModified()` detects if plan was customized
   - If customized, early return prevents form overwrite
   - Saved price/duration/permissions are preserved

4. **Display to User**
   - Plan shows as selected in sidebar
   - All fields display saved values:
     - Price
     - Duration
     - User limits
     - Module permissions

---

## Data Structure

### Saved PlanSnapshot
```javascript
{
  _id: ObjectId,                      // Plan reference
  code: "standard",
  name: "Standard Plan",
  billingCycle: "MONTHLY",            // Can be "TRIAL" or "MONTHLY"
  pricePaise: 15000,                  // Can be customized
  durationDays: 30,                   // Can be customized
  description: "...",
  userPricing: {                      // Can be customized
    max_employees: 50,
    max_suppliers: 100,
    max_customers: 500,
    // ...
  },
  modulePermissions: [                // Normalized format
    {
      moduleKey: "inventory",
      displayName: "Inventory",
      visible: true,
      actions: [
        { key: "view", displayName: "View", enabled: true },
        { key: "create", displayName: "Create", enabled: true },
        // ...
      ]
    },
    // ... more modules
  ],
  hasTax: true,
  taxIncluded: true,
  taxName: "GST"
}
```

---

## Complete Workflow Example

### **Step 1: Create Company - Select Plan**

```
1. User fills company details (Step 0)
2. User fills branch details (Step 1)
3. User selects "Standard Plan" (Step 2)
   - Can modify Price: 150 (₹)
   - Can modify Duration: 90 days
   - Can toggle module permissions
4. Clicks NEXT
   - Backend saves planSnapshot with all customizations
```

### **Step 2: Later - Edit Company**

```
1. User opens Companies list
2. Finds the created company
3. Clicks EDIT
4. Backend returns company with:
   {
     name: "XYZ Corp",
     planSnapshot: {
       _id: "plan_123",
       name: "Standard Plan",
       pricePaise: 15000,      // ← Customized price
       durationDays: 90,       // ← Customized duration
       modulePermissions: [...]  // ← Customized permissions
     }
   }
5. Form is prefilled in Step 2 (Plan Settings)
6. User sees "Standard Plan" highlighted
7. All saved customizations are displayed
8. Can modify further or proceed
```

---

## Key Features

✅ **Automatic Persistence**
- Plan data is automatically saved when moving to next step
- No manual save needed

✅ **Smart Pre-filling**
- Fetches stored planSnapshot from database
- Matches with plan list in sidebar
- Preserves all customizations

✅ **Customization Support**
- Users can customize price, duration, and permissions
- Customizations are saved and restored on edit

✅ **Normalization**
- Module permissions are normalized when selected
- Consistent data structure in database

✅ **Backward Compatible**
- If no planSnapshot exists (new company), uses default plan

---

## Database Schema

**Company Model** (`support-backend/src/saas/models/company.model.js`)

```javascript
{
  name: String,
  email: String,
  // ... other fields ...
  
  // ← Stores entire plan snapshot selected for this company
  planSnapshot: Schema.Types.Mixed,
  
  selectedAddons: Schema.Types.Mixed,
  // ... more fields ...
}
```

---

## Testing Checklist

 - [ ] Create new company with custom plan (modify price/duration)
 - [ ] Save and verify plan is stored
 - [ ] Edit company and verify:
     - [ ] Correct plan is highlighted in sidebar
     - [ ] Custom price/duration are displayed
     - [ ] Module permissions are preserved
 - [ ] Modify plan further and re-save
 - [ ] Verify changes persist on next edit

---

## Technical Notes

### Why Not Store Plan Reference ID?
Initially, we could just store `planId`, but that would lose customizations. Since users can modify price, duration, and permissions per company, we need to store the entire snapshot.

### How Matching Works
- Plans table has all canonical plans with standard pricing
- Each company stores a snapshot of the plan when assigned
- Snapshot acts as an "apex copy" specific to that company
- Allows plan definitions to change without affecting existing companies

### Module Permissions Normalization
When a plan is selected, module permissions are normalized to ensure consistent structure:
- Raw plan data: `actions` array with various field names
- Normalized: `actions` with standard `{ key, displayName, enabled }`
- This allows consistent handling regardless of source

---

## FAQ

**Q: What if the plan definition changes after assignment?**
A: The company keeps its original snapshot. The plan definition can change without affecting existing companies.

**Q: Can I change the plan for a company?**
A: Yes! Go to Step 2 (Plan Settings) and select a different plan. This creates a new snapshot.

**Q: What if I customize price but don't save?**
A: Unsaved changes are lost when navigating away. Save with NEXT button to persist.

**Q: How do I prevent accidental modifications?**
A: Implement a "locked plan" feature if needed, by disabling the price/duration fields after first save.

