// src/saas/models/cart.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CartItemSchema = new Schema({
  itemType: { type: String, enum: ['PLAN','ADDON'], required: true },
  itemId: { type: Schema.Types.ObjectId, required: true },
  units: { type: Number, default: 1 }
}, { _id: false });

const CartSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  items: [CartItemSchema],
  couponCode: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);
