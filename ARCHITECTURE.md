# 🏗️ Cash Payment Recording - Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CompanyList.jsx                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • Displays company table                                   │  │
│  │ • Has "💰 Record" button in Cash Payment column            │  │
│  │ • Button only shows if hasPermission("saas.company_...")   │  │
│  │ • Opens CashPaymentDialog on click                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  CashPaymentDialog.jsx                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • Dialog component                                         │  │
│  │ • Fetches pending orders: GET /saas/order                 │  │
│  │ • Dropdown to select order                                │  │
│  │ • Text input for cash receipt number                      │  │
│  │ • Submit button (POST /saas/company/:id/...)             │  │
│  │ • Shows success/error messages                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP POST
                           │ Content-Type: application/json
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  company.route.js                                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ POST /:companyId/record-cash-payment                       │  │
│  │ ├─ authJwt middleware (verify JWT)                         │  │
│  │ ├─ rbac("saas.company_record_payment") middleware          │  │
│  │ └─ tryCatch(controller.recordCashPayment)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  company.controller.js                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ recordCashPayment()                                        │  │
│  │ ├─ Extract: companyId, orderId, cashReceiptNo, createdBy  │  │
│  │ ├─ Call: CompanyService.recordCashPayment()               │  │
│  │ ├─ Enqueue: audit.log_event job                           │  │
│  │ └─ Return: JSON response                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  company.service.js                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ recordCashPayment()                                        │  │
│  │ ├─ MongoDB Session.startTransaction()                     │  │
│  │ ├─ Validate:                                              │  │
│  │ │  ├─ Order exists (findById)                             │  │
│  │ │  ├─ Order belongs to company                            │  │
│  │ │  └─ No duplicate receipt (idempotency)                  │  │
│  │ ├─ Calculate: amountDue from order                        │  │
│  │ ├─ Create: Payment record (Payment model)                 │  │
│  │ ├─ Create: Transaction record (Transaction model)         │  │
│  │ ├─ Update: Order → {paymentStatus: "paid", status: ...}  │  │
│  │ ├─ Activate: Subscription (if pending_activation)         │  │
│  │ ├─ Activate: Company (if draft)                           │  │
│  │ ├─ Session.commitTransaction()                            │  │
│  │ └─ Return: success response                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  MongoDB                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Collections Updated:                                       │  │
│  │ • payments (NEW DOCUMENT)                                  │  │
│  │ • transactions (NEW DOCUMENT)                              │  │
│  │ • orders (UPDATE status, paymentStatus, paidAt)           │  │
│  │ • subscriptions (UPDATE status to active if needed)        │  │
│  │ • companies (UPDATE status to active if needed)            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  Job Queue (Background)                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ audit.log_event job enqueued                              │  │
│  │ └─ Creates audit trail record                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ JSON Response
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React) Response                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CashPaymentDialog.jsx                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • Display success message                                 │  │
│  │ • Auto-close after 1.5 seconds                            │  │
│  │ • Callback: onSuccess()                                   │  │
│  │   └─ Refresh company list                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  CompanyList.jsx                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • Refresh table data                                       │  │
│  │ • Show updated company status (now "active")               │  │
│  │ • Payment recorded successfully ✅                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Flow

```
USER ACTION
   │
   ├─ Views Company List page
   │
   ├─ Locates company (e.g., "Draft" status)
   │
   ├─ Clicks "💰 Record" button
   │  ├─ Permission check: hasPermission("saas.company_record_payment")
   │  └─ If true: Show button, else: Hide button
   │
   ├─ Dialog opens
   │  ├─ Shows company info (name, plan)
   │  └─ Fetches orders: GET /saas/order?companyId=...
   │     └─ Backend returns pending/partial orders
   │
   ├─ User selects order from dropdown
   │
   ├─ User enters cash receipt number
   │  └─ Example: "CASH-2024-001"
   │
   ├─ Clicks "Record Payment" button
   │
   ├─ Frontend validates:
   │  ├─ Receipt number not empty ✓
   │  ├─ Order selected ✓
   │  └─ Shows loading spinner
   │
   ├─ POST /saas/company/:companyId/record-cash-payment
   │  ├─ Payload: { orderId, cashReceiptNo }
   │  └─ Headers: { Authorization: Bearer JWT }
   │
   ├─ Backend receives request
   │  ├─ JWT validation ✓
   │  ├─ RBAC check: saas.company_record_payment ✓
   │  └─ Pass to controller
   │
   ├─ Controller validates:
   │  ├─ orderId and cashReceiptNo provided ✓
   │  └─ Call service
   │
   ├─ Service starts atomic transaction
   │  ├─ Find order: success ✓
   │  ├─ Order belongs to company ✓
   │  ├─ Check duplicate receipt: none found ✓
   │  ├─ Create Payment record ✓
   │  ├─ Create Transaction record ✓
   │  ├─ Update Order → paid status ✓
   │  ├─ Activate Subscription ✓
   │  ├─ Activate Company ✓
   │  └─ Commit transaction ✓
   │
   ├─ Service returns success response
   │
   ├─ Controller enqueues audit job
   │
   ├─ Response sent to frontend
   │  └─ { success: true, data: { ... } }
   │
   ├─ Dialog shows success message
   │
   ├─ Auto-close after 1.5 seconds
   │
   ├─ Callback: onSuccess() triggered
   │
   ├─ Company list refreshed
   │  └─ GET /saas/company (with pagination)
   │
   └─ Updated company list displayed
      └─ Company status now "active" ✓
```

---

## Data Flow Diagram

```
FRONTEND INPUT
├─ Company selected
├─ Order selected from dropdown
└─ Cash receipt number entered
         │
         ↓
   VALIDATION (Frontend)
   ├─ Receipt number not empty
   └─ Order selected
         │
         ↓
   HTTP REQUEST
   ├─ Method: POST
   ├─ URL: /saas/company/{id}/record-cash-payment
   ├─ Body: { orderId, cashReceiptNo }
   └─ Headers: { Authorization, Content-Type }
         │
         ↓
   MIDDLEWARE CHAIN
   ├─ authJwt
   │  └─ Extract and verify JWT
   │     └─ Attach user to req
   ├─ rbac
   │  └─ Check user has "saas.company_record_payment"
   │     └─ If not, return 403 Forbidden
   └─ tryCatch
      └─ Catch any errors during processing
         │
         ↓
   CONTROLLER
   ├─ Extract: companyId, orderId, cashReceiptNo
   ├─ Validate: required fields present
   └─ Call: CompanyService.recordCashPayment()
         │
         ↓
   SERVICE (Atomic Transaction)
   ├─ Start MongoDB session
   ├─ START TRANSACTION
   │  ├─ VALIDATE
   │  │  ├─ const order = Order.findById(orderId)
   │  │  ├─ Check: order.companyId === companyId
   │  │  ├─ const payment = Payment.findOne({orderId, reference})
   │  │  └─ Check: !payment (idempotency)
   │  │
   │  ├─ CALCULATE
   │  │  └─ amountDue = order.finalAmountPaise
   │  │
   │  ├─ CREATE PAYMENT
   │  │  └─ Payment.create({
   │  │     orderId,
   │  │     companyId,
   │  │     paymentMethod: "cash",
   │  │     reference: cashReceiptNo,
   │  │     amountPaise: amountDue,
   │  │     status: "completed",
   │  │     completedAt: now()
   │  │  })
   │  │
   │  ├─ CREATE TRANSACTION
   │  │  └─ Transaction.create({
   │  │     companyId,
   │  │     type: "CASH_PAYMENT",
   │  │     amountPaise: amountDue,
   │  │     source: "cash",
   │  │     reference: cashReceiptNo,
   │  │     orderId
   │  │  })
   │  │
   │  ├─ UPDATE ORDER
   │  │  └─ Order.updateOne({
   │  │     paymentStatus: "paid",
   │  │     status: "completed",
   │  │     paidAt: now()
   │  │  })
   │  │
   │  ├─ ACTIVATE SUBSCRIPTION (if needed)
   │  │  └─ if (subscription.status === "pending_activation") {
   │  │     Subscription.updateOne({
   │  │       status: "active",
   │  │       activatedAt: now(),
   │  │       expiresAt: calculateExpiry()
   │  │     })
   │  │  }
   │  │
   │  ├─ ACTIVATE COMPANY (if needed)
   │  │  └─ if (company.status === "draft") {
   │  │     Company.updateOne({
   │  │       status: "active",
   │  │       activatedAt: now()
   │  │     })
   │  │  }
   │  │
   │  └─ COMMIT TRANSACTION
   │
   ├─ Return success response
   └─ Enqueue audit job (background)
         │
         ↓
   DATABASE CHANGES
   ├─ payments: 1 new document
   ├─ transactions: 1 new document
   ├─ orders: 1 updated (status, paymentStatus, paidAt)
   ├─ subscriptions: 1 updated (status, activatedAt, expiresAt) [optional]
   └─ companies: 1 updated (status, activatedAt) [optional]
         │
         ↓
   RESPONSE (JSON)
   ├─ success: true
   ├─ data: {
   │  ├─ paymentId: "...",
   │  ├─ orderId: "...",
   │  ├─ amountPaise: 500000,
   │  ├─ paymentMethod: "cash",
   │  ├─ reference: "CASH-2024-001",
   │  ├─ status: "completed",
   │  └─ message: "Cash payment recorded successfully..."
   │ }
   │
   └─ HTTP Status: 200 OK
         │
         ↓
   FRONTEND RESPONSE HANDLING
   ├─ Dialog receives success response
   ├─ Display success message
   ├─ Hide input fields
   ├─ Show "Close" button
   ├─ Auto-close after 1.5 seconds
   └─ Call onSuccess() callback
         │
         ↓
   COMPANY LIST REFRESH
   ├─ Fetch companies list
   ├─ Show updated company status
   └─ User sees changes immediately
```

---

## State Management

### Frontend Component States

```javascript
CashPaymentDialog {
  cashReceiptNo: string,           // User input
  orders: Array<Order>,             // Fetched from backend
  selectedOrderId: string,          // Selected dropdown option
  loading: boolean,                 // API request in progress
  fetchingOrders: boolean,          // Initial order fetch
  error: string,                    // Error message to display
  success: string                   // Success message to display
}

CompanyList {
  companies: Array<Company>,        // List of companies
  selectedCompany: Company,         // Company for dialog
  cashPaymentOpen: boolean,         // Dialog visibility
  page: number,                     // Current page
  limit: number,                    // Items per page
  total: number,                    // Total items
  q: string,                        // Search query
  order: string,                    // Sort direction
  orderBy: string                   // Sort field
}
```

### Backend Data Model

```javascript
Payment {
  _id: ObjectId,
  orderId: ObjectId,                // Reference to Order
  companyId: ObjectId,              // Reference to Company
  paymentMethod: "cash",
  reference: string,                // Cash receipt number
  amountPaise: number,
  status: "completed",
  completedAt: Date,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

Transaction {
  _id: ObjectId,
  companyId: ObjectId,              // Reference to Company
  type: "CASH_PAYMENT",
  amountPaise: number,
  source: "cash",
  reference: string,                // Cash receipt number
  orderId: ObjectId,                // Reference to Order
  description: string,
  status: "completed",
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling Flow

```
POSSIBLE ERRORS
│
├─ Frontend Validation
│  ├─ Receipt number empty → Show "required" message
│  ├─ No order selected → Disable submit button
│  └─ Order fetch fails → Show error alert
│
├─ Authentication (401)
│  └─ JWT invalid/expired → Redirect to login
│
├─ Authorization (403)
│  └─ Missing permission → Show permission denied
│
├─ Validation (400)
│  ├─ orderId or cashReceiptNo missing
│  ├─ Order not found
│  ├─ Order doesn't belong to company
│  ├─ Cash receipt already recorded (idempotency)
│  └─ Display: "orderId and cashReceiptNo are required"
│
├─ Database Error (500)
│  ├─ Transaction rollback
│  ├─ Return: "Internal server error"
│  └─ Log: Error details to console/logs
│
└─ Network Error
   └─ Axios catches and shows error message

RESPONSE HANDLING
├─ 200 OK → Show success message, refresh list
├─ 400 Bad Request → Show error message from server
├─ 401 Unauthorized → Redirect to login
├─ 403 Forbidden → Show permission message
├─ 404 Not Found → Show "not found" message
└─ 500 Server Error → Show generic error message
```

---

## Security Layers

```
LAYER 1: Frontend
├─ Component-level permission check
├─ Button visibility based on permission
├─ Input validation
└─ Loading state to prevent double-submit

LAYER 2: Network
├─ HTTPS encryption (in production)
├─ JWT token in Authorization header
└─ CORS policy enforcement

LAYER 3: Route
├─ JWT validation (authJwt middleware)
├─ RBAC permission check (rbac middleware)
├─ CORS headers verification
└─ Error handling (tryCatch middleware)

LAYER 4: Business Logic
├─ Order validation
├─ Company ownership verification
├─ Idempotency check (duplicate prevention)
└─ Database transaction atomicity

LAYER 5: Database
├─ MongoDB session transactions
├─ Atomic commit/rollback
├─ Index on orderId + reference (for idempotency)
└─ User audit logging

LAYER 6: Audit
├─ Background job for audit trail
├─ Action logged: record_cash_payment
├─ User tracked: createdBy
└─ Timestamp recorded
```

---

## Technology Stack

```
Frontend
├─ React 18
├─ Material-UI (MUI)
├─ Axios (HTTP client)
├─ React Router (navigation)
└─ Custom hooks (usePermissions)

Backend
├─ Node.js
├─ Express.js
├─ MongoDB
├─ Mongoose (ODM)
├─ Job Queue (background jobs)
└─ JWT (authentication)

Infrastructure
├─ MongoDB (database)
├─ Redis (optional, for job queue)
├─ Express middleware (auth, RBAC, error)
└─ Audit trail system
```

---

**Document Version**: 1.0
**Created**: 2024
**Status**: ✅ Complete

