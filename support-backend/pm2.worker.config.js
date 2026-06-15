module.exports = {
  apps: [
    // ============================================
    // Main Backend API Server
    // ============================================
    {
      name: "support-backend",
      script: "src/server.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      },
      error_file: "logs/backend-error.log",
      out_file: "logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    },

    // ============================================
    // SAAS Workers - Subscription Management
    // ============================================
    {
      name: "saas-subscription-expiry-worker",
      script: "src/saas/workers/subscription/subscriptionExpiryWorker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/subscription-expiry-error.log",
      out_file: "logs/subscription-expiry-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "subscription-expiry"
      }
    },
    {
      name: "saas-subscription-grace-reactivation-worker",
      script: "src/saas/workers/subscription/subscriptionGraceReactivationWorker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/grace-reactivation-error.log",
      out_file: "logs/grace-reactivation-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "grace-reactivation"
      }
    },
    {
      name: "saas-subscription-reminder-worker",
      script: "src/saas/workers/subscription/subscriptionReminderWorker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/subscription-reminder-error.log",
      out_file: "logs/subscription-reminder-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "subscription-reminder"
      }
    },

    // ============================================
    // SAAS Workers - Addon Management
    // ============================================
    {
      name: "saas-addon-expiry-worker",
      script: "src/saas/workers/subscription/addonExpiry.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/addon-expiry-error.log",
      out_file: "logs/addon-expiry-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "addon-expiry"
      }
    },
    {
      name: "saas-pending-addon-applier-worker",
      script: "src/saas/workers/subscription/pendingAddonApplier.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/pending-addon-applier-error.log",
      out_file: "logs/pending-addon-applier-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "pending-addon-applier"
      }
    },

    // ============================================
    // SAAS Workers - Trial Management
    // ============================================
    {
      name: "saas-trial-expiry-worker",
      script: "src/saas/workers/trialExpiry.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/trial-expiry-error.log",
      out_file: "logs/trial-expiry-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "trial-expiry"
      }
    },

    // ============================================
    // SAAS Workers - Billing & Payment
    // ============================================
    {
      name: "saas-billing-worker",
      script: "src/saas/workers/billing.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/billing-error.log",
      out_file: "logs/billing-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "billing"
      }
    },
    {
      name: "saas-payment-reconciliation-worker",
      script: "src/saas/workers/paymentReconciliation.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/payment-reconciliation-error.log",
      out_file: "logs/payment-reconciliation-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "payment-reconciliation"
      }
    },
    {
      name: "saas-proration-worker",
      script: "src/saas/workers/proration.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/proration-error.log",
      out_file: "logs/proration-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "proration"
      }
    },

    // ============================================
    // SAAS Workers - Usage & Quota
    // ============================================
    {
      name: "saas-usage-quota-enforcement-worker",
      script: "src/saas/workers/usageQuotaEnforcement.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/usage-quota-enforcement-error.log",
      out_file: "logs/usage-quota-enforcement-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "usage-quota-enforcement"
      }
    },

    // ============================================
    // SAAS Workers - Wallet & Deduction
    // ============================================
    {
      name: "saas-wallet-deduction-worker",
      script: "src/saas/workers/walletDeduction.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/wallet-deduction-error.log",
      out_file: "logs/wallet-deduction-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "wallet-deduction"
      }
    },

    // ============================================
    // SAAS Workers - Notifications
    // ============================================
    {
      name: "saas-notification-worker",
      script: "src/saas/workers/notificationWorker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/notification-error.log",
      out_file: "logs/notification-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "notification"
      }
    },

    // ============================================
    // SAAS Workers - System & Maintenance
    // ============================================
    {
      name: "saas-hard-delete-worker",
      script: "src/saas/workers/hardDeleteWorker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/hard-delete-error.log",
      out_file: "logs/hard-delete-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "hard-delete"
      }
    },
    {
      name: "saas-health-worker",
      script: "src/saas/workers/health.worker.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      error_file: "logs/health-error.log",
      out_file: "logs/health-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        WORKER_TYPE: "health"
      }
    }
  ]
};
