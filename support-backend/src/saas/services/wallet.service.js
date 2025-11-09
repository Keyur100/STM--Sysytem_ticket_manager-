const Wallet = require('../models/wallet.model');
const Company = require('../models/company.model');

class WalletService {
  /**
   * Create a wallet for a company if not exists.
   */
  static async createForCompany(companyId, createdBy) {
    const existing = await Wallet.findOne({ company: companyId });
    if (existing) return existing;

    const wallet = await Wallet.create({
      company: companyId,
      balance: 0,
      transactions: [],
      createdBy,
      updatedBy: createdBy,
    });
    return wallet;
  }

  /**
   * Fetch wallet; auto-create if missing.
   */
  static async getWallet(companyId) {
    let wallet = await Wallet.findOne({ company: companyId });
    if (!wallet) {
      wallet = await Wallet.create({ company: companyId, balance: 0, transactions: [] });
    }
    return wallet;
  }

  /**
   * Add funds to a company wallet.
   */
  static async addAmount(companyId, amountPaise, source = 'MANUAL', paymentId = null, description = null) {
    if (!amountPaise || amountPaise <= 0) return;

    const wallet = await this.getWallet(companyId);
    wallet.balance = (wallet.balance || 0) + amountPaise;

    wallet.transactions.push({
      type: 'CREDIT',
      amountPaise,
      source,
      paymentId,
      description: description || source,
      date: new Date(),
    });
    await wallet.save();

    await Company.updateOne(
      { _id: companyId },
      {
        $push: {
          transactions: {
            type: 'WALLET_CREDIT',
            amountPaise,
            source,
            date: new Date(),
            paymentId,
            description: description || source,
          },
        },
      }
    );

    return wallet;
  }

  /**
   * Deduct funds (partial or full) safely from wallet.
   */
  static async deductAmount(companyId, amountPaise, source = 'DEBIT', paymentId = null, description = null) {
    if (!amountPaise || amountPaise <= 0) return;

    const wallet = await this.getWallet(companyId);
    const currentBalance = wallet.balance || 0;

    // ✅ Safety check
    if (currentBalance < amountPaise) {
      throw new Error(`Insufficient wallet balance: required ${amountPaise / 100}, available ${currentBalance / 100}`);
    }

    wallet.balance = currentBalance - amountPaise;

    wallet.transactions.push({
      type: 'DEBIT',
      amountPaise,
      source,
      paymentId,
      description: description || source,
      date: new Date(),
    });
    await wallet.save();

    await Company.updateOne(
      { _id: companyId },
      {
        $push: {
          transactions: {
            type: 'WALLET_DEBIT',
            amountPaise,
            source,
            date: new Date(),
            paymentId,
            description: description || source,
          },
        },
      }
    );

    return wallet;
  }
}

module.exports = WalletService;
