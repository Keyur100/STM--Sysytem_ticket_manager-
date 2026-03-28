# Sync Integration Changes Summary

## Overview
Updated the sync system to support both trial (testing) and actual environments with conditional URL routing based on company's plan type.

---

## Changes Made

### 1. **Backend Configuration** (`support-backend/src/saas/config/env.js`)

#### What Changed:
- Replaced individual `SYNC_REMOTE_URL_X` environment variables with organized base URLs
- Added separate URL configurations for test and actual environments

#### New Configuration:
```javascript
baseTestUrl: 'http://testing.edobiz.in/api/v1'
baseActualUrl: 'http://app.edobiz.in/api/v1'

testRemoteUrls: {
  '1': 'http://testing.edobiz.in/api/v1/company/provision/step1',
  '2': 'http://testing.edobiz.in/api/v1/company/provision/step2',
  '3': 'http://testing.edobiz.in/api/v1/company/provision/step3',
  '4': 'http://testing.edobiz.in/api/v1/company/provision/step4',
  '5': 'http://testing.edobiz.in/api/v1/company/provision/step5',
}

actualRemoteUrls: {
  '1': 'http://app.edobiz.in/api/v1/company/provision/step1',
  '2': 'http://app.edobiz.in/api/v1/company/provision/step2',
  '3': 'http://app.edobiz.in/api/v1/company/provision/step3',
  '4': 'http://app.edobiz.in/api/v1/company/provision/step4',
  '5': 'http://app.edobiz.in/api/v1/company/provision/step5',
}

remoteUrls: {
  '12345': 'http://testing.edobiz.in/api/v1',  // Fallback URL
}
```

---

### 2. **SyncLog Model** (`support-backend/src/saas/models/syncLog.model.js`)

#### What Changed:
- Added `type` field to store whether sync was for trial or actual environment

#### New Field:
```javascript
type: { type: String, enum: ['trial', 'actual'], default: 'trial' }
```

---

### 3. **Sync Controller** (`support-backend/src/saas/controllers/sync.controller.js`)

#### What Changed:
- Modified `syncStep()` function to detect company's plan trial status
- Automatically selects appropriate URLs based on plan type
- Records sync type in each log entry

#### Logic Flow:
1. Get company details
2. Check `company.planSnapshot.billingCycle` to determine if it's 'TRIAL'
3. Set `syncType = isTrial ? 'trial' : 'actual'`
4. Select URLs from `config.testRemoteUrls` (if trial) or `config.actualRemoteUrls` (if actual)
5. Create SyncLog with `type` field set to `syncType`
6. Return response with `syncType`

#### Code Snippet:
```javascript
const isTrial = company.planSnapshot?.name?.toLowerCase().includes("trial");
const syncType = isTrial ? 'trial' : 'actual';

// Select appropriate remote URLs based on trial status
const remoteUrlsMap = isTrial ? config.testRemoteUrls : config.actualRemoteUrls;
const stepUrl = remoteUrlsMap?.[step] || config.remoteUrl;

// Create log with type
await SyncLog.create({ 
  companyId, 
  step, 
  status: 'success', 
  message: 'OK',
  type: syncType,
  remoteResponse: response?.data || null 
});
```

---

### 4. **Frontend SyncModal** (`support-frontend/src/pages/saas/company/SyncModal.jsx`)

#### What Changed:
- Added company state to fetch and store company details
- Fetch company data on modal open to check plan type
- Dynamically display "TEST RUN" or "ACTUAL RUN" button based on plan

#### New Features:
1. **Company Fetching:**
   ```javascript
   const [company, setCompany] = useState(null);
   
   const fetchCompanyDetails = async () => {
     const res = await api.get(`/saas/company/${companyId}/details`);
     setCompany(res.company || null);
   };
   ```

2. **Dynamic Button Text:**
   ```javascript
   const isTrial = company?.planSnapshot?.billingCycle === 'TRIAL';
   const runButtonText = isTrial ? 'TEST RUN' : 'ACTUAL RUN';
   ```

3. **Updated Button:**
   - Button now displays `runButtonText` instead of static "Run"
   - Text updates based on company's subscribed plan

---

## URL Routing Logic

### When Company Plan has TRIAL billing cycle:
- Step 1 → `http://testing.edobiz.in/api/v1/company/provision/step1`
- Step 2 → `http://testing.edobiz.in/api/v1/company/provision/step2`
- Step 3 → `http://testing.edobiz.in/api/v1/company/provision/step3`
- Step 4 → `http://testing.edobiz.in/api/v1/company/provision/step4`
- Step 5 → `http://testing.edobiz.in/api/v1/company/provision/step5`
- SyncLog type → `'trial'`
- Button text → `'TEST RUN'`

### When Company Plan does NOT have TRIAL billing cycle:
- Step 1 → `http://app.edobiz.in/api/v1/company/provision/step1`
- Step 2 → `http://app.edobiz.in/api/v1/company/provision/step2`
- Step 3 → `http://app.edobiz.in/api/v1/company/provision/step3`
- Step 4 → `http://app.edobiz.in/api/v1/company/provision/step4`
- Step 5 → `http://app.edobiz.in/api/v1/company/provision/step5`
- SyncLog type → `'actual'`
- Button text → `'ACTUAL RUN'`

---

## Environment Variables Required

Add these to your `.env` file:

```env
# Base URLs
BASE_TEST_URL=http://testing.edobiz.in/api/v1
BASE_ACTUAL_URL=http://app.edobiz.in/api/v1

# Test environment step URLs (optional - will use defaults)
SYNC_REMOTE_URL_1=http://testing.edobiz.in/api/v1/company/provision/step1
SYNC_REMOTE_URL_2=http://testing.edobiz.in/api/v1/company/provision/step2
SYNC_REMOTE_URL_3=http://testing.edobiz.in/api/v1/company/provision/step3
SYNC_REMOTE_URL_4=http://testing.edobiz.in/api/v1/company/provision/step4
SYNC_REMOTE_URL_5=http://testing.edobiz.in/api/v1/company/provision/step5

# Actual environment step URLs (optional - will use defaults)
SYNC_ACTUAL_REMOTE_URL_1=http://app.edobiz.in/api/v1/company/provision/step1
SYNC_ACTUAL_REMOTE_URL_2=http://app.edobiz.in/api/v1/company/provision/step2
SYNC_ACTUAL_REMOTE_URL_3=http://app.edobiz.in/api/v1/company/provision/step3
SYNC_ACTUAL_REMOTE_URL_4=http://app.edobiz.in/api/v1/company/provision/step4
SYNC_ACTUAL_REMOTE_URL_5=http://app.edobiz.in/api/v1/company/provision/step5

# Fallback URLs
SYNC_REMOTE_URL=http://testing.edobiz.in/api/v1
SYNC_REMOTE_URL_12345=http://testing.edobiz.in/api/v1
```

---

## Data Flow

```
Company Created with Plan (billingCycle: TRIAL or MONTHLY)
         ↓
User opens Sync Modal
         ↓
Frontend fetches company details → checks planSnapshot.billingCycle
         ↓
         ├─ TRIAL → Shows "TEST RUN" button
         └─ NOT TRIAL → Shows "ACTUAL RUN" button
         ↓
User clicks TEST RUN / ACTUAL RUN
         ↓
Backend sync.controller.syncStep()
         ├─ Fetches company
         ├─ Checks company.planSnapshot.billingCycle
         ├─ Sets syncType = 'trial' or 'actual'
         ├─ Selects appropriate URLs
         ├─ Makes API call to correct environment
         └─ Logs with type field
         ↓
Frontend displays logs with type information
```

---

## Database Migration Note

If you have existing SyncLog entries, the `type` field will default to `'trial'` for backward compatibility.

To update existing logs to reflect actual runs (if they were made to actual environment), run:
```javascript
// This should be done manually or through a migration script
db.synclogs.updateMany({}, { $set: { type: 'trial' } })
```

---

## Key Benefits

1. ✅ **Automatic URL Selection** - No manual URL switching needed
2. ✅ **Clear Environment Indication** - Button text shows which environment will be used
3. ✅ **Audit Trail** - Sync logs record whether run was trial or actual
4. ✅ **Flexible Configuration** - Can override defaults via environment variables
5. ✅ **Backward Compatible** - Uses defaults if env vars not provided
6. ✅ **Plan-Based Routing** - Automatically routes based on company's subscription plan

---

## Files Modified

1. ✅ `support-backend/src/saas/config/env.js` - Configuration
2. ✅ `support-backend/src/saas/models/syncLog.model.js` - Database schema
3. ✅ `support-backend/src/saas/controllers/sync.controller.js` - Logic
4. ✅ `support-frontend/src/pages/saas/company/SyncModal.jsx` - UI

