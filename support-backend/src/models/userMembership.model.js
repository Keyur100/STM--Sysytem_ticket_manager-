const { Schema, model } = require("mongoose");
const UserMembershipSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "UserAuth" },
  roleId: { type: Schema.Types.ObjectId, ref: "Role" },
  departmentId: { type: Schema.Types.ObjectId, ref: "Department" },//null for SA and NA
  isPrimary: { type: Boolean, default: false }
});
const UserMembership = model("UserMembership", UserMembershipSchema);
module.exports = { UserMembership };
