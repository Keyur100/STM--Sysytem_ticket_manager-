// src/saas/constants/subscription.constant.js
const { env: planEnv } = require('./plan.constant');

// ========================= TAX CONFIGURATION =========================
const TAX_PERCENT = Number(process.env.TAX_PERCENT || 18);
const TAX_NAME = process.env.TAX_NAME || 'GST';

// ========================= GRACE PERIOD CONFIGURATION =========================
const GRACE_DAYS = Number(process.env.SUBSCRIPTION_GRACE_DAYS || 7);

// ========================= BILLING CYCLE CONFIGURATION =========================
const DEFAULT_SUBSCRIPTION_DURATION_DAYS = Number(process.env.SUBSCRIPTION_DEFAULT_DURATION_DAYS || 30);

// ========================= TIME CONSTANTS =========================
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULTS = {
  BILLING_DAYS: planEnv.DEFAULT_BILLING_DAYS
};

module.exports = {
  // Tax Configuration
  TAX_PERCENT,
  TAX_NAME,
  
  // Grace Period & Duration
  GRACE_DAYS,
  DEFAULT_SUBSCRIPTION_DURATION_DAYS,
  DAY_MS,
  
  // Defaults
  DEFAULTS,
  
  // Subscription Status
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
  
  // Billing Cycles
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
