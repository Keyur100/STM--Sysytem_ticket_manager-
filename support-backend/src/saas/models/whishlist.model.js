// src/saas/models/wishlist.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WishlistSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'Plan' },
  addonId: { type: Schema.Types.ObjectId, ref: 'Addon' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', WishlistSchema);
