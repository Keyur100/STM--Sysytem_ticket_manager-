# ⚡ Upgrade & Reactivate - Quick Reference

## 🎯 At a Glance

```
Upgrade:     Switch subscription to higher plan with proration
Reactivate:  Renew or restore expired subscription with carried-over add-ons
Type:        Atomic operations (no sessions)
Permissions: saas.subscription_upgrade, saas.subscription_reactivate
```

---

## 📍 File Locations

### Backend
| File | Location | Change |
|------|----------|--------|
| Service | `support-backend/src/saas/services/company.service.js` | Lines 753-1113 (2 methods) |
| Controller | `support-backend/src/saas/controllers/company.controller.js` | Lines 210-264 (2 handlers) |
| Routes | `support-backend/src/saas/routes/company.route.js` | Lines 47-58 (2 routes) |
| Permissions | `support-backend/src/saas/seed/data/modules.data.js` | Lines 746-747 (2 perms) |

### Frontend
| File | Location | Type |
|------|----------|------|
| Upgrade Dialog | `support-frontend/src/pages/saas/subscription/UpgradeDialog.jsx` | NEW |
| Reactivate Dialog | `support-frontend/src/pages/saas/subscription/ReactivateDialog.jsx` | NEW |
| Subscription List | `support-frontend/src/pages/saas/subscription/SubscriptionList.jsx` | NEW |
| Permissions | `support-frontend/src/helpers/permissionList.js` | MODIFIED |

---

## 🔗 API Endpoints

```
POST /saas/subscriptions/:subscriptionId/upgrade
POST /saas/subscriptions/:subscriptionId/reactivate
```

Both require:
- JWT Authentication
- RBAC permission check
- Valid subscription ID

---

## 💡 Key Features

### Upgrade
✅ Plan validation (must be higher price)  
✅ Usage limits check  
✅ Proration calculation  
✅ Coupon support  
✅ Wallet integration  
✅ Auto-activation when paid  

### Reactivate
✅ Automatic mode detection (renewal/restore/fresh)  
✅ Grace period handling (7 days)  
✅ Add-on carry-over  
✅ Coupon support  
✅ Wallet integration  
✅ Auto-activation when paid  

---

## 🧪 Usage Examples

### Frontend - Upgrade
```jsx
const [upgradeOpen, setUpgradeOpen] = useState(false);
const [selectedSub, setSelectedSub] = useState(null);

const handleUpgrade = (subscription) => {
  setSelectedSub(subscription);
  setUpgradeOpen(true);
};

return (
  <>
    <Button onClick={() => handleUpgrade(sub)}>⬆️ Upgrade</Button>
    
    <UpgradeDialog
      open={upgradeOpen}
      subscription={selectedSub}
      onClose={() => setUpgradeOpen(false)}
      onSuccess={() => fetchSubscriptions()}
    />
  </>
);
```

### Frontend - Reactivate
```jsx
const [reactivateOpen, setReactivateOpen] = useState(false);

const handleReactivate = (subscription) => {
  setSelectedSub(subscription);
  setReactivateOpen(true);
};

return (
  <>
    <Button onClick={() => handleReactivate(sub)}>🔄 Renew</Button>
    
    <ReactivateDialog
      open={reactivateOpen}
      subscription={selectedSub}
      onClose={() => setReactivateOpen(false)}
      onSuccess={() => fetchSubscriptions()}
    />
  </>
);
```

### Backend - Service Call
```javascript
// Upgrade
const result = await CompanyService.upgradeSubscription({
  subscriptionId: "sub_123",
  newPlanId: "plan_456",
  couponCode: "SAVE10",
  useWallet: true,
  createdBy: "user_789"
});

// Reactivate
const result = await CompanyService.reactivateSubscription({
  subscriptionId: "sub_123",
  couponCode: "RENEW20",
  useWallet: true,
  createdBy: "user_789"
});
```

---

## 📊 Request/Response

### Upgrade Request
```json
{
  "newPlanId": "plan_456",
  "couponCode": "SAVE10",
  "useWallet": true
}
```

### Reactivate Request
```json
{
  "couponCode": "RENEW20",
  "useWallet": true
}
```

### Success Response
```json
{
  "success": true,
  "orderId": "order_789",
  "order": {...},
  "newSubscription": {...} || null,
  "amountDuePaise": 50000,
  "message": "..."
}
```

---

## 🔄 Data Changes

### When Upgrade/Reactivate Succeeds:
- ✅ Order created
- ✅ Transaction record created
- ✅ Wallet balance reduced (if used)
- ✅ Subscription activated (if fully paid)
- ✅ Subscription status remains ACTIVE or becomes ACTIVE

### If Amount Due:
- ⏳ Order status: `pending` or `partially_paid`
- ⏳ Subscription NOT activated yet
- ⏳ Can be paid with cash payment recording

---

## 🚀 Deployment Steps

1. **Backend**: Deploy service changes
2. **Backend**: Deploy controller changes
3. **Backend**: Deploy route changes
4. **Seed**: Run seed to add permissions
5. **Frontend**: Deploy new dialogs
6. **Frontend**: Deploy permission list update
7. **Assign**: Give permissions to roles
8. **Test**: Run all test scenarios

---

## 📝 Permissions to Assign

```
saas.subscription_upgrade      → Billing managers
saas.subscription_reactivate   → Billing managers, Finance team
```

---

## ✅ Testing Checklist

- [ ] Upgrade button appears for ACTIVE subscriptions
- [ ] Upgrade with coupon works
- [ ] Upgrade with wallet works
- [ ] Proration calculated correctly
- [ ] Reactivate button appears
- [ ] Renewal mode detects correctly
- [ ] Grace period restoration works
- [ ] Fresh purchase works after grace
- [ ] Add-ons carried over on reactivate
- [ ] Wallet deducted correctly
- [ ] Orders created with correct status
- [ ] Subscriptions activated when fully paid
- [ ] Transactions created for audit
- [ ] Permissions enforced correctly

---

## 🐛 Common Issues

### "Only ACTIVE subscriptions can be upgraded"
→ Select an ACTIVE subscription (not EXPIRED/CANCELLED)

### "Upgrade must be to a higher-priced plan"
→ New plan must cost more than current plan

### "Upgrade violates X limit"
→ Company usage exceeds new plan limits with current add-ons

### "Plan not found"
→ Invalid plan ID or plan doesn't exist

### "Subscription not found"
→ Invalid subscription ID or subscription deleted

### "Invalid subscription state for reactivation"
→ Subscription is not ACTIVE or EXPIRED

---

## 📞 Support

See [UPGRADE_REACTIVATE_IMPLEMENTATION.md](UPGRADE_REACTIVATE_IMPLEMENTATION.md) for detailed documentation.
