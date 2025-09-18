const { Schema, model } = require("mongoose");
const TagSchema = new Schema({ name: { type: String, index: true, unique: true }, slug: String, isSystem: { type: Boolean, default: false } ,
  createdAt: { type: Date, default: Date.now }

});
const Tag = model("Tag", TagSchema);
module.exports = { Tag };
