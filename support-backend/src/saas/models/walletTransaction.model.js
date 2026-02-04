const mongoose = require('mongoose');
const { Schema } = mongoose;

const WalletTransactionSchema = new Schema({
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, index: true },
  type: { type: String, enum: ['credit','debit'], required: true },
  amountPaise: { type: Number, required: true },
  reason: String,
  orderId: Schema.Types.ObjectId,
  balanceAfterPaise: Number // optional but VERY useful 
}, { timestamps: true });
WalletTransactionSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);
