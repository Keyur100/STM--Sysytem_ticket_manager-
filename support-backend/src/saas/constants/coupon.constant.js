// src/saas/constants/coupon.constant.js
const env = {
  DEFAULT_MAX_USES: parseInt(process.env.SAAS_COUPON_DEFAULT_MAX_USES || '0') // 0 => unlimited
};

module.exports = {
  env,
  CouponType: {
    PERCENT: 'percentage',
    FIXED: 'flat'
  },
  CouponStatus: {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',     
    USED: 'USED',
    INACTIVE: 'INACTIVE'

  }
};
