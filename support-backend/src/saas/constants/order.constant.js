// src/saas/constants/order.constant.js
const env = {
  DEFAULT_CURRENCY: process.env.SAAS_CURRENCY || 'INR'
};

module.exports = {
  env,
  OrderTypes: {
    PLAN: 'PLAN',
    ADDON: 'ADDON',
    WALLET_TOPUP: 'WALLET_TOPUP'
  },
  OrderStatus: {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
  }
};
