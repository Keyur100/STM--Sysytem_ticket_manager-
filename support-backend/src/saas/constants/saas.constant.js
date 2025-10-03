// saas.constant.js
const env = {
  DEFAULT_PLAN_CODE: process.env.SAAS_DEFAULT_PLAN_CODE || 'DEFAULT_PLAN',
  CURRENCY: process.env.SAAS_CURRENCY || 'INR',
  MONEY_MULTIPLIER: parseInt(process.env.SAAS_MONEY_MULTIPLIER || '100'), // 100 => paise
  DEFAULT_BILLING_DAYS: parseInt(process.env.SAAS_DEFAULT_BILLING_DAYS || '30'),
  LOW_QUOTA_ALERT_PERCENT: parseInt(process.env.SAAS_LOW_QUOTA_ALERT_PERCENT || '80')
};

const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CANCELLED: 'CANCELLED',
  UPGRADED: 'UPGRADED'
};

const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

const PaymentMethod = {
  CARD: 'CARD', UPI: 'UPI', NETBANKING: 'NETBANKING', WALLET: 'WALLET', OFFLINE: 'OFFLINE'
};

const AddonStatus = {
  ACTIVE: 'ACTIVE', PENDING: 'PENDING', ON_HOLD: 'ON_HOLD', EXPIRED: 'EXPIRED'
};

const OrderStatus = {
  PENDING: 'PENDING', PAID: 'PAID', FAILED: 'FAILED', CANCELLED: 'CANCELLED'
};

const BillingCycle = { MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' };

const CouponType = { PERCENT: 'PERCENT', FIXED: 'FIXED' };

const MetricsMap = {
  USER: 'max_employees',
  GB: 'storageMB',
  TICKET: 'max_customers',
  SUPPLIER: 'max_suppliers',
  BRANCH: 'max_branch'
};


const COMPANY_ERRORS = {
  COMPANY_NOT_FOUND: "Company not found",
  INTERNAL_SERVER_ERROR: "Something went wrong",
};

module.exports = {
  env,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  AddonStatus,
  OrderStatus,
  BillingCycle,
  CouponType,
  MetricsMap,
  COMPANY_ERRORS
};

