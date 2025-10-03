// src/saas/constants/addon.constant.js
const env = {
  DEFAULT_DURATION_DAYS: parseInt(process.env.SAAS_ADDON_DEFAULT_DURATION_DAYS || '0') // 0 => permanent
};

module.exports = {
  env,
  AddonUnits: {
    USER: 'USER',
    GB: 'GB',
    TICKET: 'TICKET',
    API_CALL: 'API_CALL',
    CUSTOM: 'CUSTOM',
    SUPPLIER: 'SUPPLIER',
CLIENT: 'CLIENT',
BRANCH: 'BRANCH',
MODULE: 'MODULE'

  },
  AddonStatus: {
    ACTIVE: 'ACTIVE',
    PENDING: 'PENDING',
    ON_HOLD: 'ON_HOLD',
    EXPIRED: 'EXPIRED'
  }
};
