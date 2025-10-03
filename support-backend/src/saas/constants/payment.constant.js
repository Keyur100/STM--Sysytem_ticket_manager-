// src/saas/constants/payment.constant.js
const env = {
  DEFAULT_PROVIDER: process.env.SAAS_PAYMENT_PROVIDER || 'RAZORPAY_OR_STRIPE',
  RECONCILE_PENDING_HOURS: parseInt(process.env.SAAS_RECONCILE_PENDING_HOURS || '48')
};

module.exports = {
  env,
  PaymentMethod: {
    CARD: 'CARD',
    UPI: 'UPI',
    NETBANKING: 'NETBANKING',
    WALLET: 'WALLET',
    OFFLINE: 'OFFLINE'
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
    AWAITING_APPROVAL: 'AWAITING_APPROVAL'

  },
  RefundDestination: {
    ORIGINAL: 'ORIGINAL', // refund to original payment method
    WALLET: 'WALLET' // refund to internal wallet
  }
};
