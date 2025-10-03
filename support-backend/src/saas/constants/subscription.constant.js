// src/saas/constants/subscription.constant.js
const { env: planEnv } = require('./plan.constant');

const DEFAULTS = {
  BILLING_DAYS: planEnv.DEFAULT_BILLING_DAYS
};

module.exports = {
  DEFAULTS,
  SubscriptionStatus: {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PENDING_ACTIVATION: 'PENDING_ACTIVATION',
    CANCELLED: 'CANCELLED',
    UPGRADED: 'UPGRADED',
    TRIAL: 'TRIAL'

  },
  BillingCycle: {
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
    QUARTERLY: 'QUARTERLY'
  },
  DowngradeBehavior: {
    IMMEDIATE: 'IMMEDIATE',
    SCHEDULE_ON_EXPIRY: 'SCHEDULE_ON_EXPIRY'
  }
};
