# 🎨 Frontend Setup & Testing Guide

## Frontend Components Created/Modified

### New Components

1. **`src/pages/saas/supportTickets/TicketList.jsx`**
   - Ticket listing table with pagination
   - Fetch tickets from `/saas/ticket-sync` endpoint
   - View ticket details dialog
   - Update status dialog with encrypted sync back to Laravel
   - Status colors: open (red), in_progress (orange), closed (green)
   - Priority indicators: high, medium, low

2. **Modified: `src/pages/saas/company/CompanyList.jsx`**
   - Added `Sync` button in company detail dialog
   - Added `Cash Payment` button with visibility logic (only when unpaid/partially paid)
   - Integrated `UpgradeDialog` for active subscriptions
   - Integrated `ReactivateDialog` for expired/suspended subscriptions
   - Real-time refresh after payment/upgrade/reactivate

### Existing Components (Already Implemented)

1. **`src/pages/saas/Modules/ModuleList.jsx`**
   - Table view with CRUD actions
   - Add/Edit modal
   - Status toggle (Active/Inactive)
   - Delete with confirmation

2. **`src/pages/saas/subscription/UpgradeDialog.jsx`**
   - Plan selection
   - Coupon code input
   - Wallet toggle
   - Price preview with proration

3. **`src/pages/saas/subscription/ReactivateDialog.jsx`**
   - Auto mode detection
   - Coupon support
   - Wallet integration

---

## Features Implemented

### 1️⃣ Cash Payment Button

**Location**: Company List detail view

**Visibility**:
- ✅ Visible: `totalPendingPaise > 0`
- ✅ Hidden: `totalPendingPaise === 0` (fully paid)

**Functionality**:
- Opens `CashPaymentDialog` component
- Records cash receipt
- Updates order status to "paid"
- Activates subscription if eligible
- Refreshes company details

**Code**:
```jsx
{hasUnpaidPayments(detailsData.company) && (
  <Button 
    variant="contained" 
    color="success"
    onClick={() => setSelectedCompany(detailsData.company)}
  >
    💰 Record Payment
  </Button>
)}
```

---

### 2️⃣ Sync Button

**Location**: Company List detail view

**Functionality**:
- Calls `POST /saas/company/:companyId/sync`
- Encrypts full company details
- Sends to remote Laravel API
- Decrypts response
- Shows success/error toast

**Code**:
```jsx
const handleSync = async (companyId) => {
  setSyncLoading(true);
  try {
    const res = await api.post(`/saas/company/${companyId}/sync`);
    setSyncMessage({ type: 'success', text: 'Sync completed' });
  } catch (err) {
    setSyncMessage({ type: 'error', text: err.response?.data?.message });
  } finally {
    setSyncLoading(false);
  }
};
```

---

### 3️⃣ Subscription Management

**Upgrade Button**:
- Visible for: `plan.status === 'ACTIVE'`
- Opens `UpgradeDialog`
- Allows selecting higher-priced plan
- Shows proration preview

**Reactivate Button**:
- Visible for: `plan.status === 'EXPIRED' || 'SUSPENDED'`
- Opens `ReactivateDialog`
- Auto-detects mode (renewal/restore/fresh)
- Carries over add-ons

**Code**:
```jsx
{hasPermission('saas.subscription_upgrade') && detailsData.company.plan.status === 'ACTIVE' && (
  <Button onClick={() => setUpgradeOpen(true)}>🚀 Upgrade</Button>
)}

{hasPermission('saas.subscription_reactivate') && (detailsData.company.plan.status === 'EXPIRED' || detailsData.company.plan.status === 'SUSPENDED') && (
  <Button onClick={() => setReactivateOpen(true)}>♻️ Reactivate</Button>
)}
```

---

### 4️⃣ Support Ticket Module

**Page**: `src/pages/saas/supportTickets/TicketList.jsx`

**Features**:
- ✅ Fetch from `/saas/ticket-sync` (proxied from Laravel)
- ✅ Table with columns: code, title, status, priority
- ✅ Status colors
- ✅ View details dialog
- ✅ Update status with dropdown
- ✅ Update priority (optional)
- ✅ Sync back to Laravel

**Status Colors**:
```jsx
status === 'open' ? '#ffebee' : // Red
status === 'in_progress' ? '#fff3e0' : // Orange
status === 'closed' ? '#e8f5e9' : // Green
'#f5f5f5' // Gray
```

**Update Flow**:
```
User clicks → View Details
→ Click "Update Status" 
→ Select new status & priority
→ POST /saas/ticket-sync/:id/status (encrypted)
→ Laravel updates & syncs back
→ Refresh table
```

---

### 5️⃣ Module Management

**Page**: `src/pages/saas/Modules/ModuleList.jsx` (already exists)

**Features**:
- ✅ List modules in table
- ✅ View details with permissions
- ✅ Add/Edit modal
- ✅ Delete with confirmation
- ✅ Toggle Active/Inactive status
- ✅ Add/Remove permissions dynamically

**Table Columns**:
- Group
- Module Key
- Display Name
- Status (Active/Inactive)
- Actions Count
- Options (View, Edit, Delete, Toggle)

---

## Route Configuration

Updated in `src/routesConfig.js`:

```javascript
{
  label: "Support Tickets",
  icon: Ticket,
  path: "/support-tickets",
  permission: "ticket.read",
  component: React.lazy(() => import("./pages/saas/supportTickets/TicketList")),
},
{
  label: "Modules",
  icon: Extension,
  path: "/modules",
  permission: "saas.module_read",
  component: React.lazy(() => import("./pages/saas/Modules/ModuleList")),
  routes: [
    {
      path: "new",
      component: React.lazy(() => import("./pages/saas/Modules/ModuleForm")),
      permission: "saas.module_create",
    },
    {
      path: ":id/edit",
      component: React.lazy(() => import("./pages/saas/Modules/ModuleForm")),
      permission: "saas.module_update",
    },
  ],
},
```

---

## Testing Guide

### 1. Test Cash Payment Button

**Setup**:
1. Create a company with pending orders
2. Set order status to "pending"
3. Open company detail view

**Test Steps**:
1. ✓ Verify "💰 Record Payment" button is visible
2. ✓ Click button → CashPaymentDialog opens
3. ✓ Select order and enter cash receipt number
4. ✓ Submit payment
5. ✓ Verify order status changes to "paid"
6. ✓ Verify company list refreshes
7. ✓ Close and reopen → button should be hidden

**Expected Result**: ✅ PASSED

---

### 2. Test Sync Button

**Setup**:
1. Configure `SYNC_REMOTE_URL` in backend
2. Ensure remote Laravel API is running
3. Backend encryption secret matches Laravel

**Test Steps**:
1. ✓ Open company detail view
2. ✓ Click "🔄 Sync" button
3. ✓ Verify loading indicator appears
4. ✓ Wait for response
5. ✓ Verify success/error message appears
6. ✓ Check backend logs for encrypted payload

**Expected Result**: ✅ Success toast after 2-3 seconds

---

### 3. Test Subscription Upgrade

**Setup**:
1. Create company with ACTIVE subscription
2. Ensure plan is "Professional" (lower tier)

**Test Steps**:
1. ✓ Open company detail → Plan Details section
2. ✓ Verify "🚀 Upgrade" button visible
3. ✓ Click button → UpgradeDialog opens
4. ✓ Select higher-priced plan (e.g., "Enterprise")
5. ✓ Verify proration preview displays correctly
6. ✓ Optional: Add coupon code
7. ✓ Optional: Toggle wallet payment
8. ✓ Click "Upgrade" → Submits to backend
9. ✓ Verify success message
10. ✓ Close and reopen → Subscription status updates

**Expected Result**: ✅ PASSED

---

### 4. Test Subscription Reactivate

**Setup**:
1. Create company with EXPIRED subscription
2. End date should be in the past

**Test Steps**:
1. ✓ Open company detail → Plan Details section
2. ✓ Verify "♻️ Reactivate" button visible
3. ✓ Click button → ReactivateDialog opens
4. ✓ Verify mode is auto-detected (shows "Renewal" or "Restore")
5. ✓ Verify add-ons are carried over
6. ✓ Optional: Add coupon code
7. ✓ Click "Reactivate" → Submits to backend
8. ✓ Verify subscription status becomes ACTIVE
9. ✓ Verify new end date is set

**Expected Result**: ✅ PASSED

---

### 5. Test Ticket List Page

**Setup**:
1. Configure `SAAS_TICKETS_URL` in backend
2. Ensure remote Laravel has sample tickets
3. Login with ticket.read permission

**Test Steps**:
1. ✓ Navigate to "Support Tickets" menu
2. ✓ Verify table loads with tickets
3. ✓ Verify columns: code, title, status, priority
4. ✓ Verify status colors are correct
5. ✓ Click "👁️ View" → Details dialog opens
6. ✓ Click "Update Status" → Status update dialog opens
7. ✓ Select new status from dropdown
8. ✓ Optional: Select priority
9. ✓ Click "Update" → Submits encrypted to Laravel
10. ✓ Verify success message
11. ✓ Verify table refreshes with new status
12. ✓ Test pagination and search

**Expected Result**: ✅ PASSED

---

### 6. Test Module Management

**Setup**:
1. Ensure database has sample modules
2. User has saas.module_* permissions

**Test Steps**:
1. ✓ Navigate to "Modules" menu
2. ✓ Verify module list table loads
3. ✓ Verify columns: group, key, displayName, status, actions
4. ✓ Click "👁️ View" → Details dialog shows permissions
5. ✓ Click "✏️ Edit" → Edit dialog opens
6. ✓ Update group/displayName
7. ✓ Add new permission (action)
8. ✓ Remove existing permission
9. ✓ Click "Save" → Module updated
10. ✓ Verify table refreshes
11. ✓ Click status toggle (switch) → Status changes
12. ✓ Click "🗑️ Delete" with confirmation → Module deleted

**Expected Result**: ✅ PASSED

---

## Browser Console Debugging

### Check API Calls

```javascript
// Open DevTools → Network tab
// Filter by /saas/company/:id/sync
// Verify:
// - Request has Authorization header
// - Response status 200
// - Response includes encrypted data
```

### Check Permissions

```javascript
// Open DevTools → Console
const { hasPermission } = usePermissions();
console.log('saas.company_record_payment:', hasPermission('saas.company_record_payment'));
console.log('saas.subscription_upgrade:', hasPermission('saas.subscription_upgrade'));
console.log('ticket.read:', hasPermission('ticket.read'));
```

### Mock API Response

```javascript
// For testing without backend:
const mockSync = {
  success: true,
  data: { remote: { recordsUpdated: 42 } }
};
console.log('Mock response:', mockSync);
```

---

## Deployment Checklist

- [ ] Environment variables set (API URLs)
- [ ] All imports correct (no 404 on lazy load)
- [ ] Permission checks in place
- [ ] Error handling for failed requests
- [ ] Loading states prevent double-submit
- [ ] Success/error messages display correctly
- [ ] Dialogs close on success
- [ ] Data refreshes after actions
- [ ] Responsive design works on mobile
- [ ] Production build succeeds (`npm run build`)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Button not showing | Check hasPermission() condition and payment status |
| Dialog doesn't open | Verify component import path and state management |
| Sync fails with 500 | Check backend SYNC_REMOTE_URL and encryption secret |
| Ticket list empty | Verify SAAS_TICKETS_URL points to correct Laravel endpoint |
| Module form doesn't save | Ensure saas.module_create permission is granted |
| Toast messages not showing | Check if Alert component is imported from MUI |

---

## Next Steps

1. ✅ All frontend components created
2. ✅ Routes configured
3. ⏳ Test with running backend
4. ⏳ Configure remote Laravel API endpoints
5. ⏳ Load test with real data
6. ⏳ Deploy to staging
7. ⏳ User acceptance testing
8. ⏳ Deploy to production
