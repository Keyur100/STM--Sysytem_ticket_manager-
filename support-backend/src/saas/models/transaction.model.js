const mongoose = require("mongoose");
const { Schema } = mongoose;

const TransactionSchema = new Schema({
  companyId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Company',
    required: true,
    index: true 
  },
  orderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Order',
    sparse: true 
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    sparse: true
  },
  type: { 
    type: String, 
    enum: ['WALLET_CREDIT', 'WALLET_DEBIT', 'SUBSCRIPTION_PURCHASE', 'REFUND', 'ADJUSTMENT','CASH_PAYMENT'],
    required: true,
    index: true
  },
  amountPaise: { 
    type: Number, 
    required: true 
  },
  source: { 
    type: String, 
    enum: ['WALLET', 'CASH','MANUAL'],// MANUAL for  wallet add in company
    default: 'WALLET'
  },
  description: String,
  paymentId: { 
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    sparse: true 
  },
  balanceAfterPaise: Number,
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'COMPLETED'
  },
  metadata: Schema.Types.Mixed,
  createdBy: { type: Schema.Types.ObjectId, ref: "UserAuth" }
}, { timestamps: true });

TransactionSchema.index({ companyId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);

// deduct wallet disabale 0 
// create flow

// BRANCH CREATION-branchName store{code,name,}
// usage - remove

// CREATE BRANCH AND USER at the same time

// now i will give company,plan,user,branch 

// //PLAN- [permissionid][1,2,3,4,5,],

// 3 rd step i will call your api - and mark status as pending--- will store in
// {store transaction id with this table } company schema'

// 4 step- when in yr compnuy it's created my api {timestamp,transaction id is array:[{_id,metadata}] ,status,message,}--

// susbcription started 

// //update flow 
// basix details updation in mine system --

// //module system ---show --api and  permision crud -- -wiuth status i will create and vikaram bhai give me taht permission id

// //--bidireaction flopw fpor ticket -{

//     status update and list api ----vikram bhai denege
// }
// //alert system for  susbcription alert,(90&)


// // get api for usage from vikaram bhai

// //when branch will add as addons ------then add user 5 ,also add 512 jb ,

// //downgrade flow will be after billing cycle  -deactivate

// //addons crud 

// //new permission add in company model
// //new permission add in company model