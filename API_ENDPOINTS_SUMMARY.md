# SaaS API Endpoints Summary

## Overview
All APIs are company-centric. They fetch data from respective tables (Order, Addon, Coupon, Subscription, Wallet, Transaction, etc.) filtered by `companyId`.

---

## Endpoints by Resource

### 1. **Company** (`/saas/company`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/saas/company` | List all companies (with pagination, search, sort) |
| GET | `/saas/company/:companyId` | Get company basic info |
| GET | `/saas/company/:companyId/details` | Get company with full aggregated data |
| GET | `/saas/company/:companyId/transactions?limit=50&page=1` | Get company transactions |
| GET | `/saas/company/:companyId/payment-history?page=1&limit=10` | Get all orders with payment details |
| POST | `/saas/company` | Create company |
| PUT | `/saas/company/:companyId` | Update company |
| POST | `/saas/company/:companyId/record-cash-payment` | Record cash payment for subscription |

**Response Fields:**
- name, email, status, plan, planExpiry, activeSubscriptionId, usage, etc.

---

### 2. **Orders** (`/saas/order`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/saas/order/company/:companyId` | Get all orders for a company |
| GET | `/saas/order/:id` | Get specific order |
| POST | `/saas/order` | Create new order |

**Order contains:**
- items (plan, addons, custom charges)
- totals (totalPayablePaise, tax, discount)
- payments (array with payment methods, status, amounts)
- companyId (links to company)

---

### 3. **Subscriptions** (`/saas/subscription`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/saas/subscription/:id` | Get subscription by ID |
| GET | `/saas/subscription/company/:companyId` | Get all subscriptions for company |
| POST | `/saas/subscription` | Create subscription |

**Subscription contains:**
- planSnapshot (plan details at time of subscription)
- planPricePaise, status, endAt
- addonSnapshot (addons attached)
- companyId

---

### 4. **Addons** (`/saas/addon`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/saas/addon` | Get all available addons |
| GET | `/saas/addon/:id` | Get addon by ID |
| GET | `/saas/addon/company/:companyId` | Get addons used by company (from orders) |
| POST | `/saas/addon` | Create addon (admin) |
| PUT | `/saas/addon/:id` | Update addon (admin) |
| DELETE | `/saas/addon/:id` | Delete addon (admin) |

**Addon contains:**
- value, name, pricePaise, hasTax, taxIncluded

---

### 5. **Coupons** (`/saas/coupon`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/saas/coupon` | Get all coupons |
| GET | `/saas/coupon/get-perticular/:companyId` | Get coupons for company |
| POST | `/saas/coupon` | Create coupon |
| POST | `/saas/coupon/apply` | Apply coupon to order |

**Coupon contains:**
- code, discountValue, companyId (optional, if company-specific)
- usageCount, usageMap (per-company usage)

---

### 6. **Wallet** (`/saas/wallet`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/saas/wallet/:companyId` | Get wallet balance |
| POST | `/saas/wallet/topup/:companyId` | Add balance (topup) |
| POST | `/saas/wallet/deduct/:companyId` | Deduct balance |
| GET | `/saas/wallet/:companyId/transactions` | Get wallet transactions |

**Wallet contains:**
- balancePaise, companyId, status
- lastUpdated

---

### 7. **Transactions** (`/saas/transaction` - via company)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/saas/company/:companyId/transactions` | Get all transactions for company |

**Transaction contains:**
- type (SUBSCRIPTION_PURCHASE, WALLET_CREDIT, WALLET_DEBIT, REFUND, ADJUSTMENT)
- amountPaise, companyId, source
- description, createdAt

---

## Frontend Integration Points

### Company List Page
- Table columns: name, email, plan, planExpiry, status
- Actions: Edit, View (opens Details Modal), Delete

### Company Details Modal (Lazy-Loaded Accordions)
1. **Company Info** - Basic details (no API call)
2. **Plan Details** - `/saas/subscription/:id` (on expand)
3. **Addons** - `/saas/addon/company/:companyId` (on expand)
4. **Orders** - `/saas/order/company/:companyId` (on expand)
5. **Transactions** - `/saas/company/:companyId/transactions` (on expand)
6. **Wallet** - `/saas/wallet/:companyId` (on expand)
7. **Coupons** - `/saas/coupon/get-perticular/:companyId` (on expand)

---

## Data Flow

```
Company
  ├─ has activeSubscriptionId → Subscription (plan, addons, expiry)
  ├─ has Orders (companyId filter)
  │   ├─ items: [plan, addons, custom]
  │   ├─ payments: [method, status, amount]
  │   └─ totals: totalPayablePaise
  ├─ has Wallet (companyId filter)
  ├─ has Transactions (companyId filter)
  ├─ can use Coupons (companyId filter)
  └─ can have Addons (via orders)
```

---

## Notes
- All endpoints require authentication (`authJwt`)
- Most endpoints require RBAC permission checks
- Addon model does NOT have companyId field (addons are system-wide; companies get them via orders)
- Coupon model HAS optional companyId (can be global or company-specific)
- Subscription and Order models have companyId (indexed for performance)
