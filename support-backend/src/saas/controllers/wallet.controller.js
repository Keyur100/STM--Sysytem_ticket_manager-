// src/saas/controllers/wallet.controller.js
const WalletService = require('../services/wallet.service');

exports.getBalance = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const balance = await WalletService.getBalance(companyId);
    res.json({ success: true, balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.topup = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { amountPaise, method } = req.body;
    // create order+payment flow would be better; simplified direct credit here
    const w = await WalletService.credit(companyId, amountPaise, { method, note: 'manual topup' });
    res.json({ success: true, wallet: w });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
