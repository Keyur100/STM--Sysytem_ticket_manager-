// src/saas/constants/wallet.constant.js
const env = {
  DEFAULT_CURRENCY: process.env.SAAS_CURRENCY || 'INR',
  DEFAULT_START_BALANCE: parseInt(process.env.SAAS_WALLET_DEFAULT_START || '0')
};

module.exports = {
  env,
  WalletTxnType: {
    TOPUP: 'TOPUP',
    DEDUCT: 'DEDUCT',
    REFUND: 'REFUND',
    PRORATA_CREDIT: 'PRORATA_CREDIT',
    MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT'

  }
};

//
