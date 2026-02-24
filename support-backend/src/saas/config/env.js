module.exports = {
  // Plan
  DEFAULT_PLAN_CODE: process.env.DEFAULT_PLAN_CODE,
  DEFAULT_BILLING_DAYS: process.env.DEFAULT_BILLING_DAYS,

  // Payment
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL,

  // Sync 3rd party api call
  apiKey: process.env.SYNC_API_KEY,
  apiSecret: process.env.SYNC_API_SECRET,
  remoteUrl: process.env.SYNC_REMOTE_URL,
  // Optional per-step remote URLs (overrides `remoteUrl` when set)
  remoteUrls: {
    '1': process.env.SYNC_REMOTE_URL_1 || process.env.SYNC_REMOTE_URL,
    '2': process.env.SYNC_REMOTE_URL_2 || process.env.SYNC_REMOTE_URL,
    '3': process.env.SYNC_REMOTE_URL_3 || process.env.SYNC_REMOTE_URL,
  },
  requestTimeout: 20000,
  allowedTimeWindow: 5 * 60 * 1000, // 5 minutes
};
