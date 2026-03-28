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
  baseTestUrl: process.env.BASE_TEST_URL || 'http://testing.edobiz.in/api/v1',
  baseActualUrl: process.env.BASE_ACTUAL_URL || 'http://app.edobiz.in/api/v1',
  // Optional per-step remote URLs for test environment
  testRemoteUrls: {
    '1': process.env.SYNC_REMOTE_URL_1 || 'http://testing.edobiz.in/api/v1/company/provision/step1',
    '2': process.env.SYNC_REMOTE_URL_2 || 'http://testing.edobiz.in/api/v1/company/provision/step2',
    '3': process.env.SYNC_REMOTE_URL_3 || 'http://testing.edobiz.in/api/v1/company/provision/step3',
    '4': process.env.SYNC_REMOTE_URL_4 || 'http://testing.edobiz.in/api/v1/company/provision/step4',
    '5': process.env.SYNC_REMOTE_URL_5 || 'http://testing.edobiz.in/api/v1/company/provision/step5',
  },
  // Per-step remote URLs for actual environment
  actualRemoteUrls: {
    '1': process.env.SYNC_ACTUAL_REMOTE_URL_1 || 'http://app.edobiz.in/api/v1/company/provision/step1',
    '2': process.env.SYNC_ACTUAL_REMOTE_URL_2 || 'http://app.edobiz.in/api/v1/company/provision/step2',
    '3': process.env.SYNC_ACTUAL_REMOTE_URL_3 || 'http://app.edobiz.in/api/v1/company/provision/step3',
    '4': process.env.SYNC_ACTUAL_REMOTE_URL_4 || 'http://app.edobiz.in/api/v1/company/provision/step4',
    '5': process.env.SYNC_ACTUAL_REMOTE_URL_5 || 'http://app.edobiz.in/api/v1/company/provision/step5',
  },
  // Fallback for both environments
  remoteUrl: process.env.SYNC_REMOTE_URL || 'http://testing.edobiz.in/api/v1',
  requestTimeout: 20000,
  allowedTimeWindow: 5 * 60 * 1000, // 5 minutes
};
