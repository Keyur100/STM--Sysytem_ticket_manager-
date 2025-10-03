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
      label: { type: String, required: true }
    }
  ],
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ModuleSchema.index({ moduleKey: 1 });

module.exports = mongoose.model('Module', ModuleSchema);
