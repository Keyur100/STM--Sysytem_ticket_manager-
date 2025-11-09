// src/saas/controllers/wallet.controller.js
const WalletService = require('../services/wallet.service');

exports.getBalance = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const wallet = await WalletService.getWallet(companyId);
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.topup = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { amountPaise, source = 'MANUAL', description } = req.body;

    const wallet = await WalletService.addAmount(companyId, amountPaise, source, null, description);
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deduct = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { amountPaise, source = 'MANUAL', description } = req.body;

    const wallet = await WalletService.deductAmount(companyId, amountPaise, source, null, description);
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { companyId } = req.params;
    const wallet = await WalletService.getWallet(companyId);
    res.json({ success: true, transactions: wallet.transactions || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

