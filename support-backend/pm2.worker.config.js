module.exports = {
  apps: [
    // Main backend API
    {
      name: "support-backend",
      script: "src/server.js",
      watch: false,
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    },

    // Workers
    {
      name: "assignment-worker",
      script: "src/workers/assignmentWorker.js",
      watch: false
    },
    {
      name: "reply-worker",
      script: "src/workers/replyWorker.js",
      watch: false
    },
    {
      name: "escalation-worker",
      script: "src/workers/escalationWorker.js",
      watch: false
    },
    {
      name: "autoclose-worker",
      script: "src/workers/autocloseWorker.js",
      watch: false
    },
    {
      name: "notification-worker",
      script: "src/workers/notificationWorker.js",
      watch: false
    },

    // SAAS Subscription Workers
    {
      name: "saas-notification-worker",
      script: "src/saas/workers/notificationWorker.js",
      watch: false
    },
    {
      name: "subscription-expiry-worker",
      script: "src/workers/saas/subscriptionExpiryWorker.js",
      watch: false
    },
    {
      name: "grace-period-worker",
      script: "src/workers/saas/gracePeriodWorker.js",
      watch: false
    },
    {
      name: "usage-alert-worker",
      script: "src/workers/saas/usageAlertWorker.js",
      watch: false
    },
    {
      name: "plan-expiry-reminder-worker",
      script: "src/workers/saas/planExpiryReminderWorker.js",
      watch: false
    },
    {
      name: "addon-expiry-worker",
      script: "src/workers/saas/addonExpiryWorker.js",
      watch: false
    },
    {
      name: "subscription-renewal-worker",
      script: "src/workers/saas/subscriptionRenewalWorker.js",
      watch: false
    },
    {
      name: "compliance-audit-worker",
      script: "src/workers/saas/complianceAuditWorker.js",
      watch: false
    }
  ]
};
