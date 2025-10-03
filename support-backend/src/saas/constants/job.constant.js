// src/saas/constants/job.constant.js
const env = {
  DEFAULT_MAX_RETRIES: parseInt(process.env.SAAS_JOB_DEFAULT_MAX_RETRIES || '5'),
  DEFAULT_POLL_INTERVAL_MS: parseInt(process.env.SAAS_JOB_POLL_INTERVAL_MS || '1000')
};

module.exports = {
  env,

  // job types - used when enqueueing jobs so workers pick them up
  JOB_TYPES: {
    AUDIT_LOG: 'audit.log_event',
    NOTIFICATION: 'notification.send',
    SUBSCRIPTION_EXPIRE: 'subscription.expire',
    SUBSCRIPTION_RENEW: 'subscription.renew',
    SUBSCRIPTION_UPGRADE_PRORATE: 'subscription.upgrade_prorate',
    ADDON_APPLY_PENDING: 'addon.apply_pending',
    ADDON_EXPIRE: 'addon.expire',
    PAYMENT_RECONCILE: 'payment.reconcile',
    PAYMENT_REFUND: 'payment.refund',
    PAYMENT_OFFLINE_APPROVAL: 'payment.offline_approval',
    BILLING_GENERATE_INVOICE: 'billing.generate_invoice',
    USAGE_QUOTA_ENFORCE: 'usage.quota_enforce',
    WALLET_DEDUCT: 'wallet.deduct',
    WISHLIST_SYNC: 'wishlist.sync',
    CART_CHECKOUT: 'cart.checkout',
    TRIAL_EXPIRE: 'trial.expire',
    HEALTH_CHECK:'HEALTH_CHECK',
    CART_CLEANUP:'CART_CLEANUP',
    WORKER_SCALING:'WORKER_SCALING'
  },

  JOB_STATUS: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    RETRY: 'RETRY',
    DONE: 'DONE',
    DLQ: 'DLQ'
  }
};
