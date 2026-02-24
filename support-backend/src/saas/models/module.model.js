// src/saas/models/module.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ModuleSchema = new Schema({
  group: { type: String, required: true },
  moduleKey: { type: String, required: true, index: true },
  displayName: { type: String },
  actions: [
    {
      key: { type: String, required: true },
      label: { type: String, required: true },
      id: { type: String } ,
      parentId: { type: String },
    }
  ],
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuth' }
}, { timestamps: true });

ModuleSchema.index({ moduleKey: 1 });

module.exports = mongoose.model('Module', ModuleSchema);
/* DELETE module common, id not used in creation 
create cron to delete isDeleted true in every module after 30 days cycle  so in every api module isDelrted true shouldbne there with time 
*/