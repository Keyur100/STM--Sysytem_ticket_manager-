const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  code: { type: String },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  companyName: { type: String },
  name: { type: String, required: true },
  tagline: { type: String },
  address: { type: String },
  logo: { type: String },
  phone: { type: String },
  phone2: { type: String },
  email: { type: String },
  gstn: { type: String },
  pan: { type: String },
  status: { type: String, default: 'active' },
  contactInfo: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Branch', BranchSchema);
