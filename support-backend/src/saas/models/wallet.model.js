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
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true, index: true },
  balance: { type: Number, default: 0 }, // paise
  currency: { type: String, default: 'INR' },
  isActive: { type: Boolean, default: true },
  transactions: { type: [WalletTxSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', WalletSchema);
