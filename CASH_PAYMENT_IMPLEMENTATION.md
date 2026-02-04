# 💰 Cash Payment Recording Implementation

## ✅ Summary

Implemented a complete cash payment recording feature for SaaS company subscriptions, allowing finance/billing personnel to record cash payments received against pending orders.

---

## 🔧 Backend Implementation

### 1. **Service Method** - [company.service.js](support-backend/src/saas/services/company.service.js#L912)

**Method**: `CompanyService.recordCashPayment()`

**Features**:
- ✅ Atomic transaction with MongoDB session
- ✅ Validates order exists and belongs to company
- ✅ Idempotency check - prevents duplicate cash receipts
- ✅ Creates payment record in Payment model
- ✅ Creates transaction record in Transaction model
- ✅ Updates order status to "completed" with paymentStatus "paid"
- ✅ Activates subscription if pending
- ✅ Activates company if still in draft status
- ✅ Returns detailed response with payment info

**Transaction Flow**:
```
1. Validate order exists
2. Verify order belongs to company
3. Check no duplicate receipt (idempotency)
4. Calculate amount due
5. Create payment record (ATOMIC)
6. Create transaction record (ATOMIC)
7. Update order status (ATOMIC)
8. Activate subscription if needed (ATOMIC)
9. Activate company if needed (ATOMIC)
10. Commit transaction
```

---

### 2. **Controller** - [company.controller.js](support-backend/src/saas/controllers/company.controller.js#L160)

**Endpoint**: `POST /saas/company/:companyId/record-cash-payment`

**Handler**: `recordCashPayment()`

**Request Body**:
```json
{
  "orderId": "65a8f9e2c1234567890abcd1",
  "cashReceiptNo": "CASH-2024-001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "65a8f9e2c1234567890abcd2",
    "orderId": "65a8f9e2c1234567890abcd1",
    "companyId": "65a8f9e2c1234567890abcd0",
    "amountPaise": 500000,
    "paymentMethod": "cash",
    "reference": "CASH-2024-001",
    "status": "completed",
    "message": "Cash payment recorded successfully. Subscription activated."
  }
}
```

**Error Handling**:
- Returns 400 if orderId or cashReceiptNo missing
- Returns 404 if order not found
- Returns 400 if order doesn't belong to company
- Returns 400 if duplicate cash receipt found
- Logs audit event for compliance

---

### 3. **Route** - [company.route.js](support-backend/src/saas/routes/company.route.js#L38)

```javascript
router.post(
  "/:companyId/record-cash-payment",
  authJwt,                              // Requires authentication
  rbac("saas.company_record_payment"),  // RBAC permission check
  tryCatch(companyController.recordCashPayment)
);
```

---

### 4. **RBAC Permission**

**Permission Key**: `saas.company_record_payment`

**Configured In**:
- [modules.data.js](support-backend/src/saas/seed/data/modules.data.js#L746) - Backend module definition
- [permissionList.js](support-frontend/src/helpers/permissionList.js#L168) - Frontend super admin permissions

**Module Definition**:
```javascript
{
  "group": "Company",
  "moduleKey": "company",
  "displayName": "Company",
  "actions": [
    { "key": "saas.company_create", "label": "Create Company" },
    { "key": "saas.company_read", "label": "Read Company" },
    { "key": "saas.company_update", "label": "Update Company" },
    { "key": "saas.company_delete", "label": "Delete Company" },
    { "key": "saas.company_manage", "label": "Manage Company" },
    { "key": "saas.company_record_payment", "label": "Record Cash Payment" }  // ← NEW
  ]
}
```

---

## 🎨 Frontend Implementation

### 1. **Cash Payment Dialog** - [CashPaymentDialog.jsx](support-frontend/src/pages/saas/company/CashPaymentDialog.jsx)

**Features**:
- ✅ Dialog component with order selection
- ✅ Auto-fetches pending/partial orders for company
- ✅ Shows company name and plan
- ✅ Dropdown to select order (displays amount)
- ✅ Text field for cash receipt number
- ✅ Loading states during submission
- ✅ Error/success alerts
- ✅ Auto-closes on success after 1.5 seconds
- ✅ Input validation

**Props**:
```javascript
{
  open: boolean,              // Dialog visibility
  company: object,           // Company data
  onClose: function,         // Close handler
  onSuccess: function       // Refresh callback
}
```

---

### 2. **Company List Integration** - [CompanyList.jsx](support-frontend/src/pages/saas/company/CompanyList.jsx)

**New Features**:
- ✅ New "Cash Payment" column in table
- ✅ "💰 Record" button (only visible if user has `saas.company_record_payment` permission)
- ✅ Opens CashPaymentDialog on click
- ✅ Refreshes company list after successful payment
- ✅ Uses usePermissions hook for permission checking

**Button**:
```jsx
{
  field: "actions",
  label: "Cash Payment",
  width: 150,
  render: (r) =>
    hasPermission("saas.company_record_payment") && (
      <Button
        size="small"
        variant="outlined"
        color="success"
        onClick={() => {
          setSelectedCompany(r);
          setCashPaymentOpen(true);
        }}
      >
        💰 Record
      </Button>
    ),
}
```

---

## 🔐 Security Features

1. **RBAC Permission Check**: `saas.company_record_payment` required
2. **Idempotency**: Same receipt number cannot be used twice
3. **Validation**: Order must belong to company
4. **Transaction Safety**: All DB operations in atomic transaction
5. **Audit Logging**: Cash payment events logged to audit trail
6. **Authentication**: JWT authentication required

---

## 📊 Data Models Involved

### 1. **Payment Model** (New Record)
```javascript
{
  orderId: ObjectId,
  companyId: ObjectId,
  paymentMethod: "cash",
  reference: "CASH-2024-001",
  amountPaise: 500000,
  status: "completed",
  completedAt: Date,
  createdBy: ObjectId
}
```

### 2. **Transaction Model** (New Record)
```javascript
{
  companyId: ObjectId,
  type: "CASH_PAYMENT",
  amountPaise: 500000,
  source: "cash",
  reference: "CASH-2024-001",
  orderId: ObjectId,
  description: "Cash payment recorded for order...",
  status: "completed",
  createdBy: ObjectId
}
```

### 3. **Order Model** (Updated)
```javascript
{
  // Before:
  paymentStatus: "pending",
  status: "draft",
  
  // After:
  paymentStatus: "paid",
  status: "completed",
  paidAt: Date
}
```

### 4. **Subscription Model** (Updated if pending)
```javascript
{
  // Before:
  status: "pending_activation",
  
  // After:
  status: "active",
  activatedAt: Date,
  expiresAt: Date  // Calculated based on plan
}
```

### 5. **Company Model** (Updated if draft)
```javascript
{
  // Before:
  status: "draft",
  
  // After:
  status: "active",
  activatedAt: Date
}
```

---

## 🔄 API Flow

### User Flow:
1. Finance person navigates to **Company List**
2. Finds the company and clicks **"💰 Record"** button
3. **CashPaymentDialog** opens
4. Dialog fetches company's pending orders (GET `/saas/order?companyId=...`)
5. User selects order and enters cash receipt number
6. Clicks **"Record Payment"** button
7. Dialog calls **POST** `/saas/company/:companyId/record-cash-payment`
8. Backend validates and processes payment atomically
9. Success message shown, dialog closes
10. Company list refreshes to show updated status

### Backend Processing:
```
POST /saas/company/:companyId/record-cash-payment
  ↓
[authJwt middleware] - Verify JWT token
  ↓
[rbac middleware] - Check saas.company_record_payment permission
  ↓
[controller.recordCashPayment] - Extract companyId, orderId, cashReceiptNo
  ↓
[service.recordCashPayment] - Business logic
  ├── Validate order exists
  ├── Verify order belongs to company
  ├── Check idempotency
  ├── Start transaction
  ├── Create payment record
  ├── Create transaction record
  ├── Update order status
  ├── Activate subscription
  ├── Activate company
  ├── Commit transaction
  └── Return success response
  ↓
[Audit job enqueued] - Background logging
  ↓
Success response sent to frontend
```

---

## ✨ Key Features

| Feature | Status | Details |
|---------|--------|---------|
| Service Method | ✅ | Atomic transactions, idempotency check |
| Controller Endpoint | ✅ | POST `/saas/company/:id/record-cash-payment` |
| Route Registration | ✅ | With authJwt and RBAC middleware |
| RBAC Permission | ✅ | `saas.company_record_payment` defined |
| Frontend Dialog | ✅ | Order selection, validation, loading states |
| Company List Integration | ✅ | "💰 Record" button in table |
| Audit Logging | ✅ | Background job enqueued |
| Error Handling | ✅ | Comprehensive validation and messages |
| Permission Checks | ✅ | Frontend (button visibility) + Backend (RBAC) |

---

## 🧪 Testing Checklist

- [ ] User with `saas.company_record_payment` can see "💰 Record" button
- [ ] User without permission cannot see button
- [ ] Dialog shows correct company name and plan
- [ ] Order dropdown populated with pending orders
- [ ] Cannot submit without cash receipt number
- [ ] Cannot submit without order selected
- [ ] Duplicate receipt number returns error
- [ ] Payment successfully creates Payment record
- [ ] Payment successfully creates Transaction record
- [ ] Order status changes from "pending" to "completed"
- [ ] Order paymentStatus changes to "paid"
- [ ] Subscription activated (if pending)
- [ ] Company activated (if draft)
- [ ] Audit log created
- [ ] Company list refreshes after successful payment
- [ ] Dialog closes automatically on success
- [ ] Error messages display correctly

---

## 📝 Notes

- All transactions use MongoDB sessions for atomic operations
- The `calculateSubscriptionExpiry()` helper is reused from company.service.js
- Orders endpoint (`GET /saas/order`) expected to accept `companyId` query param
- Audit trail is logged asynchronously via job queue
- Frontend uses axios instance with default auth headers
- Dialog component is self-contained and reusable

---

## 🚀 Next Steps

1. Run backend seed to update permissions: `node seed/index.js`
2. Test cash payment flow in development
3. Verify audit logs are created
4. Add unit tests for idempotency check
5. Monitor transaction processing in production
6. Consider adding payment reconciliation report

