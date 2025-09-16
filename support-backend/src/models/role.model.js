const { Schema, model } = require("mongoose");
const RoleSchema = new Schema({
  name: { type: String, index: true, unique: true },
  permissions: [String],
  isSystem: { type: Boolean, default: false }
});
const Role = model("Role", RoleSchema);
module.exports = { Role };
