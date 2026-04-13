# Trial-to-Actual Company Conversion Implementation

## 📌 Summary
This document tracks the implementation of trial-to-actual company conversion and subscription reactivation enhancements.

## ✅ Completed Changes

### 1. Backend Model Changes
**File**: `support-backend/src/saas/models/company.model.js`
- Added `isTrialUsed: { type: Boolean, default: false, index: true }` field to company schema
- This explicit flag tracks whether a company is using a trial plan

### 2. Trial Detection Helper Functions
**File**: `support-backend/src/saas/services/company.service.js`
- Added `companyUsesTrial(company)` - Checks if company uses trial via `isTrialUsed` or plan billingCycle
- Added `planIsTrial(plan)` - Validates if a plan is a trial based on billingCycle value
- Both helpers improve code readability and prevent magic string comparisons

### 3. Sync Controller Enhancement
**File**: `support-backend/src/saas/controllers/sync.controller.js`
- Updated trial detection in `syncStep()` to use explicit `company.isTrialUsed` flag
- Falls back to plan snapshot metadata if flag not set
- Determines correct remote URLs (testRemoteUrls vs actualRemoteUrls) based on trial status

### 4. Grace Reactivation Worker Fix
**File**: `support-backend/src/saas/workers/subscriptionGraceReactivationWorker.js`
- Fixed subscription expiry detection to use `s.endAt` (millisecond timestamp)
- Correctly calculates grace period window for reactivation eligibility
- Previously used incorrect `s.expiredAt` property name

### 5. Company Service Trial Conversion Logic
**File**: `support-backend/src/saas/services/company.service.js`
- `createDraftCompany()` now persists `isTrialUsed` flag when creating trial company drafts
- `signupOrUpdateCompany()` implements trial-to-actual conversion:
  - Detects trial company editing actual plan: sets `orderType = "SUBSCRIPTION_UPGRADE"`
  - Passes `upgradeFromSubscriptionId` to activate old subscription cancellation
  - Updates company `isTrialUsed = false` when converting to actual plan
  - Triggers subscription migration flows automatically

### 6. Frontend Trial Company Detection
**File**: `support-frontend/src/pages/saas/company/companyList.jsx`
- Added "🚀 Convert to Actual Plan" button in company details modal
- Shows only when `company.isTrialUsed === true`
- Clicking button navigates to edit stepper for trial conversion

### 7. Plan Settings Step Enhancement
**File**: `support-frontend/src/pages/saas/company/CompanyFormStepper/PlanSettingsStep.jsx`
- Enhanced `fetchPlans()` callback to filter out trial plans when editing trial companies
- Detects trial company by checking `form.planSnapshot.billingCycle === 'trial'`
- Prevents accidental selection of trial plans during conversion flow
- Maintains `plansOverride` parameter for custom plan lists

### 8. Company Stepper Trial Tracking
**File**: `support-frontend/src/pages/saas/company/CompanyFormStepper/index.jsx`
- Added `isTrial` state to track whether company is trial during edit
- Detects trial company on form prefill and sets initial step to 0 for fresh workflow
- Passes `isTrialUsed: isTrial` in payment payload to backend
- Ensures all 5 steps are traversed for trial conversion (Contact -> Branch -> Plan -> Addons -> Payment)

## 🔄 Trial Conversion Flow

### Frontend Flow (User Perspective)
1. **Company Details View** → Click "🚀 Convert to Actual Plan" button (only visible if trial)
2. **Stepper Step 0** → Review/update company info (prefilled)
3. **Stepper Step 1** → Review/update branch details (prefilled)
4. **Stepper Step 2** → Select actual plan (trial plans hidden)
5. **Stepper Step 3** → Select/adjust addons
6. **Stepper Step 4** → Review payment, apply coupon/wallet, confirm
7. **Result** → Old trial subscription cancelled, new actual subscription created

### Backend Flow (Technical Detail)
1. Frontend sends `POST /saas/company/signup` with `isTrialUsed: true` flag
2. `signupOrUpdateCompany()` detects trial company + actual plan selection
3. Sets `orderType = "SUBSCRIPTION_UPGRADE"` to migrate subscriptions
4. Creates order with `upgradeFromSubscriptionId` pointing to old trial subscription
5. `activateSubscriptionIfEligible()` processes order:
   - Cancels old subscription (sets status=CANCELLED, endAt=now-1)
   - Creates new actual subscription
   - Carries over addons if not explicitly changed
   - Updates company with new subscription link
6. Updates company `isTrialUsed = false`

## 🔮 Incomplete / Future Work

### Reactivation Flow Enhancement
**File**: `support-frontend/src/pages/saas/subscription/ReactivateDialog.jsx`
- Current: Shows basic reactivation UI with coupon/wallet options
- Future: Should display:
  - Subscription start/end dates
  - List of bought addons with pricing
  - Plan/addon breakdown with amounts
  - Grace period status and reactivation deadline
  - Confirmation before actual reactivation

### Grace Period Worker
**File**: `support-backend/src/saas/workers/subscriptionGraceReactivationWorker.js`
- ✅ Fixed expiry timestamp detection
- ⏳ Could enhance with:
  - Grace period customization per company
  - Automatic renewal order creation
  - Proactive notification before grace period expires
  - Partial payment handling for grace reactivation

### Order Model Enhancement
**File**: `support-backend/src/saas/models/order.model.js`
- Current: Supports `upgradeFromSubscriptionId` for upgrade orders
- Consider: Store reactivation source subscription reference for audit trail

## 🧪 Testing Checklist

- [ ] Create trial company → verify isTrialUsed=true in DB
- [ ] Convert trial to actual → verify isTrialUsed=false after conversion
- [ ] Check old subscription set to CANCELLED
- [ ] Check new subscription created with actual plan
- [ ] Verify sync detects actual plan and uses correct remote URLs
- [ ] Grace reactivation worker correctly calculates grace period
- [ ] Plan list filters hide trial plans during trial company edit
- [ ] Coupon/wallet work correctly in trial conversion payment step
- [ ] Addons carry over from trial to actual subscription if not changed
- [ ] Mobile/responsive UI for convert button in company details

## 📚 Related Documentation
- [COMPLETE_6_FEATURES_STATUS.md](COMPLETE_6_FEATURES_STATUS.md) - Overall feature tracking
- [CASH_PAYMENT_QUICK_REF.md](CASH_PAYMENT_QUICK_REF.md) - Payment recording logic
- [UPGRADE_REACTIVATE_IMPLEMENTATION.md](UPGRADE_REACTIVATE_IMPLEMENTATION.md) - Upgrade flow details

## 🚀 Deployment Notes
1. Backend changes are backward compatible (isTrialUsed defaults to false)
2. Sync logic gracefully falls back to plan snapshot metadata if isTrialUsed missing
3. Frontend changes don't break for companies without isTrialUsed field
4. Can deploy frontend and backend independently - no breaking changes

