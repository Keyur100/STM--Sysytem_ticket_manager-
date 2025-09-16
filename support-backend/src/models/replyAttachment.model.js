const { model, Schema } = require("mongoose");

const ReplyAttachmentSchema = new Schema({
  replyId: { type: Schema.Types.ObjectId, ref: 'Reply', required: true, index: true },
  fileName: String,
  fileType: String,
  fileSize: Number,
  storageUrl: String,
  storageType: { type: String, enum: ['s3', 'gridfs', 'local'], default: 's3' },
  meta: Schema.Types.Mixed
}, { timestamps: true });
ReplyAttachmentSchema.index({ replyId: 1 });
module.exports.ReplyAttachment = model('ReplyAttachment', ReplyAttachmentSchema);