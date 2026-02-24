// src/saas/models/plan.model.js-omly for saas not for internal permission
const mongoose = require('mongoose');
const { Schema } = mongoose;

// const UserPricingSchema = new Schema({
//   max_employees: { type: Number, default: 0 },
//   max_branch: { type: Number, default: 0 },
//   max_customers: { type: Number, default: 0 },
//   max_suppliers: { type: Number, default: 0 },
//   max_reseller: { type: Number, default: 0 },
//   storageMB: { type: Number, default: 150 * 1024 }
// }, { _id: false });

const PlanSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true},
  description: String,
  billingCycle: { type: String, enum: ["ONETIME", "DAILY","TRIAL", "WEEKLY", "MONTHLY", "HALF_YEARLY","YEARLY"], default: "MONTHLY" },
  durationDays: { type: Number, default: null },  
  pricePaise: { type: Number, default: 0 },// similiar to planPricePaise of company 
  hasTax: { type: Boolean, default: true },// apply tax if true
  taxIncluded: { type: Boolean, default: true },//false means add tax on top of price, true means price already includes tax
  taxName: { type: String, default: "GST" },
  userPricing: Schema.Types.Mixed, //UserPricingSchema, // similiar to maxProvision of company
  // UPDATED SCHEMA TYPE ARRAY
  modulePermissions: [{ type: Schema.Types.Mixed, default: {} }], // similiar to effectivePermissions of company
  
  isActive: { type: Boolean, default: true, index: true },
  isSystem: { type: Boolean, default: false, index: true },

// EXTRA v1
  isCustom: { type: Boolean, default: false  },
  isDefault: { type: Boolean, default: false  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  planGroup: { type: String, index: true },

  // EXTRA v2
  version: { type: Number, default: 1 }

}, { timestamps: true });


PlanSchema.index({ code: 1 });
module.exports = mongoose.model('Plan', PlanSchema);


{/* 
  // create flow

BRANCH CREATION-branchName store{code,name,}
usage - remove

CREATE BRANCH AND USER at the same time

now i will give company,plan,user,branch 

//PLAN- [permissionid][1,2,3,4,5,],

3 rd step i will call your api - and mark status as pending--- will store in
{store transaction id with this table } company schema'

4 step- when in yr compnuy it's created my api {timestamp,transaction id is array:[{_id,metadata}] ,status,message,}--

susbcription started 

//update flow 
basix details updation in mine system --

//module system ---show --api and  permision crud -- -wiuth status i will create and vikaram bhai give me taht permission id

//--bidireaction flopw fpor ticket -{

    status update and list api ----vikram bhai denege
}
//alert system for  susbcription alert,(90&)


// get api for usage from vikaram bhai

//when branch will add as addons ------then add user 5 ,also add 512 jb ,

//downgrade flow will be after billing cycle  -deactivate

//addons crud 
//new permission add in company model
*/} 