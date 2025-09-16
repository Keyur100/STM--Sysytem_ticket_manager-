const { Schema, model } = require("mongoose");

const ReplySchema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'UserAuth', required: true, index: true },
  message: { type: String },
  type: { type: String, enum: ['public', 'internal'], default: 'public' },
  meta: Schema.Types.Mixed
}, { timestamps: true });
ReplySchema.index({ ticketId: 1, createdAt: 1 });
module.exports.Reply = model('Reply', ReplySchema);