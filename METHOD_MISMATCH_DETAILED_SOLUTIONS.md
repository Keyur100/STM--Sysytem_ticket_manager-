# Service-Controller Method Mismatches - Detailed Code Analysis

## Issue #1: PaymentService.createPayment() NOT FOUND

### ❌ Location: [subscription.controller.js](src/saas/controllers/subscription.controller.js#L17)

```javascript
// Line 17 - CONTROLLER CALL (doesn't exist in service)
const payment = await PaymentService.createPayment({ 
  orderId: order._id, 
  companyId, 
  amountPaise: order.amountPaise, 
  method, 
  createdBy: req.user && req.user._id 
});
```

### ✅ What EXISTS in payment.service.js:

```javascript
// payment.service.js - createOrderAndPayment() - DIFFERENT METHOD
static async createOrderAndPayment({ 
  companyId, 
  type, 
  targetId, 
  amountPaise, 
  paymentMethod,    // NOTE: different parameter name
  couponCode, 
  renewalType, 
  createdBy, 
  meta,
  plan 
}) {
  // Creates both order AND payment together
  // ...
}
```

### 🔧 SOLUTION OPTIONS:

**Option A:** Create a wrapper method in PaymentService:
```javascript
static async createPayment({ orderId, companyId, amountPaise, method, createdBy }) {
  const payment = await Payment.create({
    order: orderId, 
    company: companyId, 
    amountPaise, 
    method, 
    status: PaymentStatus.CREATED, 
    createdBy, 
    updatedBy: createdBy
  });
  return payment;
}
```

**Option B:** Update the controller to use `createOrderAndPayment()` instead

---

## Issue #2: PaymentService.markOnlinePaymentSuccess() NOT FOUND

### ❌ Location: [subscription.controller.js](src/saas/controllers/subscription.controller.js#L24)

```javascript
// Line 24 - CONTROLLER CALL (method doesn't exist)
const paid = await PaymentService.markOnlinePaymentSuccess(
  payment._id, 
  'TX_DEMO_' + Date.now(), 
  { demo: true }
);
```

### ❌ What's in payment.service.js:

The method is **NOT IMPLEMENTED**. The service only has:
- ✅ `createOrderAndPayment()`
- ✅ `verifyRazorpayPayment()`
- ✅ `handleWebhook()`
- ✅ `cancelOrder()`

### 🔧 SOLUTION:

Implement the missing method in PaymentService:

```javascript
static async markOnlinePaymentSuccess(paymentId, transactionId, meta = {}) {
  const payment = await Payment.findByIdAndUpdate(
    paymentId,
    {
      status: PaymentStatus.SUCCESS,
      transactionId,
      providerResponse: meta,
      updatedAt: new Date()
    },
    { new: true }
  ).populate('order');

  if (!payment) throw new Error('Payment not found');

  // Update order status
  const order = await Order.findByIdAndUpdate(
    payment.order,
    { status: OrderStatus.PAID },
    { new: true }
  );

  // Apply subscription/addon
  if (order) {
    await SubscriptionService.applyPayment(order, payment);
  }

  return payment;
}
```

---

## Issue #3: SubscriptionService.upgradePlan() NOT FOUND

### ❌ Location: [subscription.controller.js](src/saas/controllers/subscription.controller.js#L35)

```javascript
// Line 35 - CONTROLLER CALL (method name doesn't match)
const sub = await SubscriptionService.upgradePlan(
  companyId, 
  newPlanCode,      // expects CODE not object
  { proRate, autoPayMethod, createdBy }
);
```

### ✅ What EXISTS in subscription.service.js:

```javascript
// subscription.service.js - changePlan() - DIFFERENT METHOD NAME
static async changePlan(
  companyId, 
  newPlan,          // expects PLAN object, not code
  payment, 
  opts = { immediate: true }
) {
  // Implementation...
}
```

### 🔧 SOLUTION OPTIONS:

**Option A:** Rename the service method:
```javascript
// In subscription.service.js - Line ~147
static async upgradePlan(
  companyId, 
  newPlanCode,      // Accept code
  { proRate = false, autoPayMethod = null, createdBy = null } = {}
) {
  // Look up plan by code first
  const newPlan = await Plan.findOne({ code: newPlanCode, isActive: true });
  if (!newPlan) throw new Error('Plan not found');

  return this.changePlan(companyId, newPlan, payment, { immediate: true });
}
```

**Option B:** Update controller to pass plan object instead of code

---

## Issue #4: SubscriptionService.scheduleDowngrade() NOT FOUND

### ❌ Location: [subscription.controller.js](src/saas/controllers/subscription.controller.js#L46)

```javascript
// Line 46 - CONTROLLER CALL (method doesn't exist at all)
const sub = await SubscriptionService.scheduleDowngrade(
  companyId, 
  targetPlanCode
);
```

### ❌ What EXISTS in subscription.service.js:

No similar method exists. The service only has:
- ✅ `newSubscription()`
- ✅ `renewSubscription()`
- ✅ `applyAddon()`
- ✅ `changePlan()`
- ✅ `applyPayment()`

### 🔧 SOLUTION:

Implement the missing method:

```javascript
static async scheduleDowngrade(companyId, targetPlanCode) {
  const targetPlan = await Plan.findOne({ code: targetPlanCode, isActive: true });
  if (!targetPlan) throw new Error('Target plan not found');

  const subscription = await Subscription.findOne({ 
    company: companyId, 
    status: 'ACTIVE' 
  });
  if (!subscription) throw new Error('Active subscription not found');

  // Schedule downgrade for next renewal
  subscription.scheduledDowngradeTo = targetPlan._id;
  subscription.scheduledDowngradeAt = new Date();
  await subscription.save();

  // Audit
  await enqueueJob({
    type: JOB_TYPES.AUDIT_LOG,
    payload: {
      action: 'subscription.schedule_downgrade',
      subscriptionId: subscription._id,
      companyId,
      targetPlanId: targetPlan._id
    }
  });

  return subscription;
}
```

---

## Issue #5: CouponService.validateAndComputeDiscount() NOT FOUND

### ❌ Location: [order.service.js](src/saas/services/order.service.js#L27)

```javascript
// Line 27 - SERVICE CALLING ANOTHER SERVICE (method doesn't exist)
const couponRes = await CouponService.validateAndComputeDiscount({ 
  code: couponCode, 
  amountPaise, 
  companyId, 
  type, 
  targetId 
});

if (!couponRes.ok) throw new Error('Coupon invalid: ' + couponRes.reason);
discountPaise = couponRes.discountPaise || 0;
```

### ✅ What EXISTS in coupon.service.js:

```javascript
// coupon.service.js - validateAndApply() - DIFFERENT METHOD NAME & SIGNATURE
static async validateAndApply(code, planCode, amountPaise) {
  const coupon = await Coupon.findOne({ code });
  if (!coupon) throw new Error("Invalid coupon");
  
  // Validation logic...
  
  let discountPaise = 0;
  if (coupon.discountType === CouponType.PERCENT) {
    discountPaise = Math.floor((amountPaise * coupon.discountValue) / 100);
  } else {
    discountPaise = Math.floor(coupon.discountValue);
  }
  
  return {
    coupon,
    discountPaise,
    finalAmountPaise: Math.max(0, amountPaise - discountPaise),
  };
}
```

### 🔧 SOLUTION:

**Option A:** Create the missing method:

```javascript
static async validateAndComputeDiscount({ code, amountPaise, companyId, type, targetId }) {
  try {
    const coupon = await Coupon.findOne({ code });
    if (!coupon) return { ok: false, reason: 'Invalid coupon' };

    const now = Date.now();
    
    if (coupon.validFrom && now < coupon.validFrom) 
      return { ok: false, reason: 'Coupon not active yet' };
    if (coupon.validTo && now > coupon.validTo) 
      return { ok: false, reason: 'Coupon expired' };
    if (coupon.usedCount >= coupon.maxUses) 
      return { ok: false, reason: 'Coupon usage limit reached' };
    if ((coupon.minSpendPaise || 0) > amountPaise) 
      return { ok: false, reason: 'Minimum spend not met' };

    let discountPaise = 0;
    if (coupon.discountType === 'percentage') {
      discountPaise = Math.floor((amountPaise * coupon.discountValue) / 100);
    } else {
      discountPaise = coupon.discountValue;
    }

    return {
      ok: true,
      coupon,
      discountPaise,
      finalAmountPaise: Math.max(0, amountPaise - discountPaise)
    };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}
```

**Option B:** Update order.service.js to use `validateAndApply()`:

```javascript
// Update order.service.js line 27
if (couponCode) {
  const couponRes = await CouponService.validateAndApply(couponCode, null, amountPaise);
  discountPaise = couponRes.discountPaise || 0;
}
```

---

## Summary Table

| Issue | Service | Missing Method | Found Alternative | Severity |
|-------|---------|---------------|--------------------|----------|
| #1 | PaymentService | `createPayment()` | `createOrderAndPayment()` | 🔴 CRITICAL |
| #2 | PaymentService | `markOnlinePaymentSuccess()` | None | 🔴 CRITICAL |
| #3 | SubscriptionService | `upgradePlan()` | `changePlan()` | 🔴 CRITICAL |
| #4 | SubscriptionService | `scheduleDowngrade()` | None | 🔴 CRITICAL |
| #5 | CouponService | `validateAndComputeDiscount()` | `validateAndApply()` | 🔴 CRITICAL |

---

## Testing Checklist

After implementing fixes, test:

- [ ] PaymentService.createPayment() creates payment records
- [ ] PaymentService.markOnlinePaymentSuccess() updates payment + order status
- [ ] SubscriptionService.upgradePlan() upgrades subscription by plan code
- [ ] SubscriptionService.scheduleDowngrade() schedules downgrade for next renewal
- [ ] CouponService.validateAndComputeDiscount() validates and computes discount

