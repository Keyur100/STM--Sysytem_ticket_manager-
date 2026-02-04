const mongoose = require('mongoose');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const Company = require('../models/company.model');

class WalletService {
  /**
   * Create a wallet for a company if not exists.
   */
  static async createForCompany(companyId, createdBy) {
    let wallet = await Wallet.findOne({ companyId });
    if (wallet) return wallet;

    wallet = await Wallet.create({
      companyId,
      balancePaise: 0,
      createdBy
    });

    return wallet;
  }

  /**
   * Fetch wallet; auto-create if missing.
   */
  static async getWallet(companyId) {
    let wallet = await Wallet.findOne({ companyId });

    if (!wallet) {
      wallet = await Wallet.create({
        companyId,
        balancePaise: 0
      });
    }

    return wallet;
  }

  /**
   * Add funds to a company wallet.
   */
  static async addAmount(
    companyId,
    amountPaise,
    source = 'MANUAL',
    paymentId = null,
    description = null,
    createdBy = null
  ) {
    if (!amountPaise || amountPaise <= 0) return;

    try {
      const wallet = await this.getWallet(companyId);

      const newBalance = (wallet.balancePaise || 0) + amountPaise;

      const walletTxRecord = {
        type: 'CREDIT',
        amountPaise,
        source,
        paymentId,
        description: description || source,
        date: new Date()
      };

      // Update wallet balance AND add to wallet transactions array
      await Wallet.updateOne(
        { _id: wallet._id },
        {
          $set: { balancePaise: newBalance },
          $push: { transactions: walletTxRecord }
        }
      );

      // ALSO create transaction in centralized Transaction model
      await Transaction.create({
        companyId,
        orderId: paymentId,
        type: 'WALLET_CREDIT',
        amountPaise,
        source,
        description: description || source,
        paymentId,
        balanceAfterPaise: newBalance,
        status: 'COMPLETED',
        createdBy
      });

      return await Wallet.findById(wallet._id);

    } catch (err) {
      throw err;
    }
  }

  /**
   * Deduct funds (partial or full) safely from wallet.
   */
  static async deductAmount(
    companyId,
    amountPaise,
    source = 'MANUAL',
    paymentId = null,
    description = null,
    createdBy = null
  ) {
    if (!amountPaise || amountPaise <= 0) return;

    try {
      const wallet = await this.getWallet(companyId);
      const currentBalance = wallet.balancePaise || 0;

      // ✅ Safety check
      if (currentBalance < amountPaise) {
        throw new Error(
          `Insufficient wallet balance: required ₹${amountPaise / 100}, available ₹${currentBalance / 100}`
        );
      }

      const newBalance = currentBalance - amountPaise;

      const walletTxRecord = {
        type: 'DEBIT',
        amountPaise,
        source,
        paymentId,
        description: description || source,
        date: new Date()
      };

      // Update wallet balance AND add to wallet transactions array
      await Wallet.updateOne(
        { _id: wallet._id },
        {
          $set: { balancePaise: newBalance },
          $push: { transactions: walletTxRecord }
        }
      );

      // ALSO create transaction in centralized Transaction model
      await Transaction.create({
        companyId,
        orderId: paymentId,
        type: 'WALLET_DEBIT',
        amountPaise,
        source,
        description: description || source,
        paymentId,
        balanceAfterPaise: newBalance,
        status: 'COMPLETED',
        createdBy
      });

      return await Wallet.findById(wallet._id);

    } catch (err) {
      throw err;
    }
  }

  /**
   * Get wallet-only transactions (from embedded wallet.transactions array)
   */
  static async getWalletTransactions(companyId, limit = 50, skip = 0) {
    const wallet = await Wallet.findOne({ companyId });
    if (!wallet) return { transactions: [], total: 0 };

    const allTransactions = wallet.transactions || [];
    const total = allTransactions.length;
    const transactions = allTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(skip, skip + limit);

    return { transactions, total };
  }

  /**
   * Get all transactions for a company
   */
  static async getTransactions(companyId, limit = 50, skip = 0) {
    const transactions = await Transaction.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return transactions;
  }
}

module.exports = WalletService;
