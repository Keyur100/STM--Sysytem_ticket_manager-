const mongoose = require('mongoose');
const { Schema } = mongoose;

const WalletTxSchema = new Schema({
  type: { type: String, enum: ['CREDIT','DEBIT'], required: true },
  amountPaise: { type: Number, required: true },
  source: String,
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  description: String,
  date: { type: Date, default: Date.now }
}, { _id: false });

const WalletSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, index: true, required: true },
  balancePaise: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  isActive: { type: Boolean, default: true },
  transactions: { type: [WalletTxSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' }
}, { timestamps: true });
WalletSchema.index({ companyId: 1 });

module.exports = mongoose.model('Wallet', WalletSchema);
