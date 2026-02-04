# 💰 Cash Payment Recording - Quick Reference

## ⚡ At a Glance

```
What:     Record cash payments for company subscriptions
Where:    Company List page → "💰 Record" button
How:      Dialog → Select order → Enter receipt number → Submit
Who:      Users with `saas.company_record_payment` permission
Result:   Order marked paid, subscription activated, company activated
```

---

## 🔗 File Locations

### Backend
| File | Line | Change |
|------|------|--------|
| `support-backend/src/saas/services/company.service.js` | 903 | `recordCashPayment()` method |
| `support-backend/src/saas/controllers/company.controller.js` | 160 | `recordCashPayment()` handler |
| `support-backend/src/saas/routes/company.route.js` | 38 | Route registration |
| `support-backend/src/saas/seed/data/modules.data.js` | 746 | Permission definition |

### Frontend
| File | Line | Change |
|------|------|--------|
| `support-frontend/src/helpers/permissionList.js` | 168 | Permission in superAdmin list |
| `support-frontend/src/pages/saas/company/CashPaymentDialog.jsx` | - | NEW DIALOG COMPONENT |
| `support-frontend/src/pages/saas/company/CompanyList.jsx` | 1-137 | Integrated dialog + button |

---

## 📡 API Endpoint

```
POST /saas/company/:companyId/record-cash-payment

Request:
{
  "orderId": "MongoDB_ID",
  "cashReceiptNo": "CASH-2024-001"
}

Response:
{
  "success": true,
  "data": {
    "paymentId": "...",
    "status": "completed",
    "message": "Cash payment recorded successfully..."
  }
}
```

---

## 🎯 Key Features

- ✅ Atomic database transactions
- ✅ Idempotency check (no duplicate receipts)
- ✅ RBAC permission enforcement
- ✅ Order validation
- ✅ Subscription auto-activation
- ✅ Company auto-activation
- ✅ Audit logging
- ✅ Error handling
- ✅ User-friendly dialog UI
- ✅ Permission-gated button

---

## 🔐 Security

| Layer | Check |
|-------|-------|
| Frontend | Permission-based button visibility |
| Route | JWT authentication required |
| Route | RBAC `saas.company_record_payment` required |
| Service | Order validation (exists, belongs to company) |
| Service | Idempotency check (no duplicate receipts) |
| Service | Transaction atomicity |

---

## 💾 What Gets Created/Updated

**Created**:
- Payment record (in Payment model)
- Transaction record (in Transaction model)

**Updated**:
- Order: `paymentStatus` → "paid", `status` → "completed"
- Subscription: `status` → "active" (if pending)
- Company: `status` → "active" (if draft)

---

## 🧪 Quick Test

1. Go to `/companies` (Company List)
2. Find a company with status "draft"
3. Click "💰 Record" button (must have permission)
4. Dialog opens
5. Select order from dropdown
6. Enter receipt number
7. Click "Record Payment"
8. Should see success message
9. Company list refreshes
10. Company status changes to "active"

---

## 🛠️ For Developers

### To Use Service Directly:
```javascript
const result = await CompanyService.recordCashPayment({
  companyId: "...",
  orderId: "...",
  cashReceiptNo: "...",
  createdBy: "..."
});
```

### To Call API from Frontend:
```javascript
const response = await api.post(
  `/saas/company/${companyId}/record-cash-payment`,
  { orderId, cashReceiptNo }
);
```

### To Add Permission to User:
Assign role with permission: `saas.company_record_payment`

---

## ⚙️ Configuration

**Permission**: `saas.company_record_payment`
**Module**: Company
**Requires**: RBAC middleware + JWT
**Visibility**: Button only shows if user has permission

---

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Button not visible | Check user has `saas.company_record_payment` permission |
| Orders not loading | Ensure `/saas/order` endpoint exists and returns data |
| "Receipt already recorded" error | Use unique receipt number |
| "Order not found" error | Verify orderId exists |
| "Order doesn't belong" error | Verify order belongs to selected company |

---

## 📝 Related Documentation

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Detailed overview
- [CASH_PAYMENT_IMPLEMENTATION.md](CASH_PAYMENT_IMPLEMENTATION.md) - Technical details

---

**Status**: ✅ Complete
**Last Updated**: 2024
**Files Changed**: 7
**New Files**: 1

