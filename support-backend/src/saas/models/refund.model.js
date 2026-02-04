// // refund.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// const RefundSchema = new Schema({
//   companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
//   subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
//   paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
//   amountPaise: { type: Number, required: true },
//   reason: String,
//   status: { type: String, enum: ['PENDING','CREDITED_TO_WALLET','PAID'], default: 'PENDING' },
//   meta: Schema.Types.Mixed,
//   createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' }
// }, { timestamps: true });

// module.exports = mongoose.model('Refund', RefundSchema);

const RefundSchema = new Schema({
  orderId: Schema.Types.ObjectId,
  companyId: Schema.Types.ObjectId,
  amountPaise: Number,
  reason: String,
  processedAt: Number
}, { timestamps: true });
module.exports = mongoose.model('Refund', RefundSchema);
