# 🧪 Cash Payment - Execution Test Guide

## Manual Testing Steps

### Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- Postman or similar API client
- Test company and order data in DB

---

## Test 1: Successful Cash Payment ✅

### API Call
```http
POST /saas/company/comp_123/record-cash-payment
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "orderId": "order_456",
  "cashReceiptNo": "CASH-2024-001"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "companyId": "comp_123",
    "amountPaise": 400000,
    "paymentMethod": "cash",
    "reference": "CASH-2024-001",
    "status": "completed",
    "subscriptionId": "sub_789",
    "message": "Cash payment recorded successfully. Subscription activated."
  }
}
```

### Verify in MongoDB
```javascript
// Check order updated
db.orders.findOne({ _id: ObjectId("order_456") })
// Should show:
// - status: "paid"
// - final.amountDuePaise: 0
// - payments: [... { method: "cash", referenceId: "CASH-2024-001", ... }]

// Check company activated
db.companies.findOne({ _id: ObjectId("comp_123") })
// Should show:
// - status: "active"
// - activatedAt: <date>

// Check transaction created
db.transactions.findOne({ reference: "CASH-2024-001" })
// Should exist with type: "CASH_PAYMENT"

// Check subscription activated
db.subscriptions.findOne({ _id: ObjectId("sub_789") })
// Should show:
// - status: "ACTIVE"
// - activatedAt: <date>
```

### Frontend Verification
1. Go to `/companies` (Company List)
2. Refresh page
3. Find the company
4. Should see status changed to "active" ✅

---

## Test 2: Duplicate Receipt Prevention ❌

### API Call (First Time - Should Succeed)
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": "order_456",
  "cashReceiptNo": "CASH-2024-DUPLICATE"
}
```
**Response**: 200 OK ✅

### API Call (Second Time - Should Fail)
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": "order_456",
  "cashReceiptNo": "CASH-2024-DUPLICATE"  // ← Same receipt!
}
```

### Expected Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Cash receipt already recorded for this order"
}
```

### Verify
```javascript
// MongoDB should only have ONE payment with this reference
db.orders.findOne({ _id: ObjectId("order_456") }).payments
// Count of { referenceId: "CASH-2024-DUPLICATE" } should be 1
```

---

## Test 3: No Amount Due ❌

### Setup
- Use an order that's already fully paid (`final.amountDuePaise === 0`)

### API Call
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": "order_fully_paid",
  "cashReceiptNo": "CASH-2024-003"
}
```

### Expected Response (400 Bad Request)
```json
{
  "success": false,
  "error": "No amount due for this order"
}
```

---

## Test 4: Order Doesn't Belong to Company ❌

### Setup
- Order belongs to different company (different companyId)

### API Call
```http
POST /saas/company/comp_wrong/record-cash-payment

{
  "orderId": "order_from_other_company",
  "cashReceiptNo": "CASH-2024-004"
}
```

### Expected Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Order does not belong to this company"
}
```

---

## Test 5: Missing Required Fields ❌

### Test 5a: No Receipt Number
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": "order_456",
  "cashReceiptNo": ""  // ← Empty
}
```

### Expected Response (400 Bad Request)
```json
{
  "success": false,
  "error": "cashReceiptNo is required"
}
```

### Test 5b: No Order ID
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": null,
  "cashReceiptNo": "CASH-2024-005"
}
```

### Expected Response (400 Bad Request)
```json
{
  "success": false,
  "error": "orderId is required"
}
```

---

## Test 6: Authentication Check ❌

### API Call (No JWT Token)
```http
POST /saas/company/comp_123/record-cash-payment
Content-Type: application/json

{
  "orderId": "order_456",
  "cashReceiptNo": "CASH-2024-006"
}
```

### Expected Response (401 Unauthorized)
```json
{
  "success": false,
  "error": "No authorization token was found"
}
```

---

## Test 7: Permission Check ❌

### Setup
- User without `saas.company_record_payment` permission

### API Call (With valid JWT but no permission)
```http
POST /saas/company/comp_123/record-cash-payment
Authorization: Bearer {JWT_NO_PERMISSION}

{
  "orderId": "order_456",
  "cashReceiptNo": "CASH-2024-007"
}
```

### Expected Response (403 Forbidden)
```json
{
  "success": false,
  "error": "Permission denied"
}
```

---

## Test 8: Order Not Found ❌

### API Call (Non-existent order ID)
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": "order_not_exists_12345",
  "cashReceiptNo": "CASH-2024-008"
}
```

### Expected Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

## Test 9: Partial Payment Scenario ✅

### Setup
- Order with `totals.totalPayablePaise: 500000`
- Already `final.totalPaidPaise: 200000`
- Current `final.amountDuePaise: 300000`

### API Call (Pay remaining amount)
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": "order_partial",
  "cashReceiptNo": "CASH-2024-009"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "amountPaise": 300000,
    "status": "completed",
    "message": "Cash payment recorded successfully. Subscription activated.",
    "subscriptionId": "sub_xyz"
  }
}
```

### Verify in MongoDB
```javascript
db.orders.findOne({ _id: ObjectId("order_partial") })
// Should show:
// - status: "paid" (now fully paid)
// - final.amountDuePaise: 0
// - final.totalPaidPaise: 500000
```

---

## Test 10: Already Activated Prevention ❌

### Setup
- Order with `status: "paid"` AND `subscriptionId: "sub_xyz"`

### API Call (Try to pay again)
```http
POST /saas/company/comp_123/record-cash-payment

{
  "orderId": "order_already_paid",
  "cashReceiptNo": "CASH-2024-010"
}
```

### Expected Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Order already paid and subscription activated"
}
```

---

## Test 11: Frontend Button Test ✅

### Step 1: Login
- Navigate to `/login`
- Login with user who has `saas.company_record_payment` permission

### Step 2: Go to Company List
- Navigate to `/companies`
- Should see table with companies

### Step 3: Check Button Visibility
- For each company row:
  - If user HAS permission: "💰 Record" button should be VISIBLE ✅
  - If user NO permission: Button should be HIDDEN ❌

### Step 4: Click Button
- Click "💰 Record" on any company
- CashPaymentDialog should OPEN ✅

### Step 5: Check Dialog
- Should show:
  - Company name ✅
  - Company plan ✅
  - Order dropdown (populated) ✅
  - Text input for receipt number ✅
  - "Record Payment" button ✅

### Step 6: Submit Payment
- Select order from dropdown
- Enter receipt number
- Click "Record Payment"
- Should show success message ✅
- Dialog should auto-close after 1.5s ✅
- Company list should refresh ✅
- Company status should change to "active" ✅

---

## Test 12: API Error Response Flow ✅

### Check Error Handling
1. **Network Error** → Catch in Axios
   - Dialog shows: "Failed to record cash payment"
   
2. **Backend Error** → Catch in Controller
   - Dialog shows: Server error message
   
3. **Validation Error** → Catch in Service
   - Dialog shows: Validation error message

---

## Quick Test Checklist

### ✅ Happy Path
- [ ] Payment recorded successfully
- [ ] Order status changed to "paid"
- [ ] Company status changed to "active"
- [ ] Subscription activated
- [ ] Transaction record created
- [ ] Frontend refreshes
- [ ] Success message shown

### ✅ Error Handling
- [ ] Duplicate receipt prevented
- [ ] No amount due error shown
- [ ] Company mismatch detected
- [ ] Missing fields validated
- [ ] Auth check enforced
- [ ] Permission check enforced
- [ ] Order not found handled

### ✅ Frontend
- [ ] Button visible with permission
- [ ] Dialog opens on click
- [ ] Orders dropdown populated
- [ ] Input validation works
- [ ] Success message displayed
- [ ] Auto-close on success
- [ ] List refreshes

---

## Debug Commands

### Check if Session Works
```javascript
// In server logs, should see:
// ✓ Session started
// ✓ Transaction started
// ✓ Order updated with session
// ✓ Transaction created with session
// ✓ Transaction committed
// ✓ Session ended
```

### MongoDB Query to Verify
```javascript
// Find all cash payments
db.orders.find({
  "payments.method": "cash"
}).pretty()

// Find all cash payment transactions
db.transactions.find({
  type: "CASH_PAYMENT"
}).pretty()

// Check company activation
db.companies.find({
  status: "active"
}).count()
```

### Frontend Console
```javascript
// Check API response
// Should see in Network tab:
// POST /saas/company/comp123/record-cash-payment
// Status: 200 OK
// Response: { success: true, data: {...} }
```

---

## Expected Timings

| Operation | Time |
|-----------|------|
| API Request | < 500ms |
| Database Operations | < 100ms |
| Dialog Close Delay | 1500ms |
| List Refresh | < 500ms |
| **Total User Experience** | **~2-3 seconds** |

---

**Test Status**: Ready to execute
**All Tests**: 12 scenarios covered
**Expected**: 100% pass rate ✅

