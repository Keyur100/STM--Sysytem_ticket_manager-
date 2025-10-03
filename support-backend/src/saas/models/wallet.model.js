// src/saas/models/wallet.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WalletSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true, index: true },
  balance: { type: Number, default: 0 }, // store in paise
  currency: { type: String, default: 'INR' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', WalletSchema);
