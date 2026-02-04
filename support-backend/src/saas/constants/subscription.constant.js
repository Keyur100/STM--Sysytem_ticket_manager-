// src/saas/constants/subscription.constant.js
const { env: planEnv } = require('./plan.constant');

const DEFAULTS = {
  BILLING_DAYS: planEnv.DEFAULT_BILLING_DAYS
};

module.exports = {
  DEFAULTS,
  SubscriptionStatus: {
    ACTIVE: 'ACTIVE',
    EXPIRING_SOON:'EXPIRING_SOON',
    GRACE: 'GRACE',
    EXPIRED: 'EXPIRED',
    OVER_LIMIT: 'OVER_LIMIT',
    UPGRADED: 'UPGRADED',
    SUSPENDED: 'SUSPENDED',
    CANCELLED: 'CANCELLED',
  },
  BillingCycle: {
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
    QUARTERLY: 'QUARTERLY'
  },
  // DowngradeBehavior: {
  //   IMMEDIATE: 'IMMEDIATE',
  //   SCHEDULE_ON_EXPIRY: 'SCHEDULE_ON_EXPIRY'
  // }
};
