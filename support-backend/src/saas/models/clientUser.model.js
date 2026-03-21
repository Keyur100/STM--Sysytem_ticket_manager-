const mongoose = require('mongoose');

const ClientUserSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  // passwordHash: { type: String, required: true },
  status: { type: String, default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('ClientUser', ClientUserSchema);
