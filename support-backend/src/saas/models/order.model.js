const mongoose = require('mongoose');
const { Schema } = mongoose;
// const { OrderStatus } = require('../constants/saas.constant');

// const OrderSchema = new Schema({
//   company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
//   type: { type: String, enum: ['PLAN', 'ADDON', 'WALLET_TOPUP'], required: true },
//   targetId: { type: Schema.Types.ObjectId },// planId or addonId or null for topup --TODO Subscription attch?
//   amountPaise: { type: Number, required: true },
//   currency: { type: String, default: 'INR' },
//   couponCode: { type: String },
//   renewalType: { type: String, enum: ['NEW','RENEWAL','UPGRADE','DOWNGRADE'], default: 'NEW' },
//   status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
//   payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
//   meta: { type: Schema.Types.Mixed },
//   createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
//   updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
// }, { timestamps: true });

// module.exports = mongoose.model('Order', OrderSchema);
/* =========================
  ORDER
========================= */

const OrderSchema = new Schema({
  orderType: {
    type: String,
    enum: [
      'SUBSCRIPTION_PURCHASE',
      'SUBSCRIPTION_RENEWAL',
      'SUBSCRIPTION_REACTIVATE',
      'SUBSCRIPTION_UPGRADE',
      'SUBSCRIPTION_DOWNGRADE',
      'ADDON_PURCHASE',
      'WALLET_TOPUP'
    ],
    required: true,
  },

  upgradeFromSubscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  downgradeFromSubscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },

  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },

  items: [{
    type: { type: String, enum: ['plan','addon'], required: true },
    itemId: Schema.Types.ObjectId,
    name: String,
    value: String,
    qty: Number,
    priceAtPurchasePaise: Number,
    lineSubtotalPaise: Number,
    taxConfig: Schema.Types.Mixed
  }],

  discounts: [{
    couponId: Schema.Types.ObjectId,
    couponCode: String,
    discountType: String,
    discountAppliedPaise: Number
  }],

  walletUsed: {
    walletId: Schema.Types.ObjectId,
    amountPaise: Number
  },

  taxBreakdown: [{
    taxName: String,
    percentage: Number,
    taxAmountPaise: Number
  }],

  totals: {
    subtotalPaise: Number,
    totalDiscountPaise: Number,
    taxableAmountPaise: Number,
    totalTaxPaise: Number,
    totalPayablePaise: Number
  },

  // Payments are stored in a separate `payments` collection. Keep reference ids here.
  paymentIds: [{ type: Schema.Types.ObjectId, ref: 'Payment' }],

  final: {
    totalPaidPaise: Number,
    refundedAmountPaise: Number,
    amountDuePaise: Number
  },

  status: {
    type: String,
    enum: ['pending','paid','failed','cancelled','refunded','partially_paid'],
    default: 'pending'
  },
  meta: Schema.Types.Mixed

}, { timestamps: true });

OrderSchema.index({ companyId: 1, status: 1, createdAt: -1 });

// OrderSchema.methods.computeFinal = function computeFinal() {
//   const totals = this.totals || {};
//   const totalPayable = Number(totals.totalPayablePaise || 0);

//   const walletUsedAmount = (this.walletUsed && Number(this.walletUsed.amountPaise)) || 0;

//   const paymentsSum = Array.isArray(this.payments)
//     ? this.payments.reduce((sum, p) => {
//         if (!p) return sum;
//         const amt = Number(p.amountPaise || 0);
//         const status = p.status;
//         return sum + (status === 'success' ? amt : 0);
//       }, 0)
//     : 0;

//   const refunded = (this.final && Number(this.final.refundedAmountPaise)) || 0;

//   const totalPaid = paymentsSum + walletUsedAmount;

//   // amountDuePaise = totalPayable - totalPaid + refunded
//   let amountDue = totalPayable - totalPaid + refunded;
//   if (amountDue < 0) amountDue = 0;

//   this.final = this.final || {};
//   this.final.totalPaidPaise = Number(totalPaid || 0);
//   this.final.refundedAmountPaise = Number(refunded || 0);
//   this.final.amountDuePaise = Number(amountDue || 0);
// };

// // Ensure final fields are computed before validation/save
// OrderSchema.pre('validate', function preValidateCompute(next) {
//   try {
//     this.computeFinal();
//   } catch (err) {
//     return next(err);
//   }
//   return next();
// });

module.exports = mongoose.model('Order', OrderSchema);
