// wallet.service.js
// src/saas/services/wallet.service.js
const Wallet = require('../models/wallet.model');
const Company = require('../models/company.model');
const { enqueueJob } = require('../libs/jobQueue');

class WalletService {
  static async createForCompany(companyId,createdBy) {
    const w = await Wallet.create({ company: companyId, balance: 0,createdBy,
      updatedBy:createdBy });
    await enqueueJob({ type: 'audit.log_event', payload: { action: 'wallet.create', companyId, walletId: w._id }, priority: 9 });
    return w;
  }

  static async credit(companyId, amountPaise, meta = {}) {
    const w = await Wallet.findOneAndUpdate({ company: companyId }, { $inc: { balance: amountPaise } }, { new: true, upsert: true });
    await Company.findByIdAndUpdate(companyId, { $push: { transactions: { type: 'WALLET_CREDIT', amountPaise, meta, date: new Date() } } });
    await enqueueJob({ type: 'wallet.credit', payload: { companyId, amountPaise, meta }, priority: 8 });
    return w;
  }

  static async debitIfSufficient(companyId, amountPaise) {
    const w = await Wallet.findOneAndUpdate({ company: companyId, balance: { $gte: amountPaise } }, { $inc: { balance: -amountPaise } }, { new: true });
    if (w) {
      await Company.findByIdAndUpdate(companyId, { $push: { transactions: { type: 'WALLET_DEBIT', amountPaise, date: new Date() } } });
      await enqueueJob({ type: 'wallet.debit', payload: { companyId, amountPaise }, priority: 8 });
    }
    return w;
  }

  static async getBalance(companyId) {
    const w = await Wallet.findOne({ company: companyId });
    return w ? w.balance : 0;
  }
}

module.exports = WalletService;
