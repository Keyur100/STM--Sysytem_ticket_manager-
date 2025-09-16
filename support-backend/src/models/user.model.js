const { TokenExpiredError } = require("jsonwebtoken");
const { Schema, model } = require("mongoose");

const UserAuthSchema = new Schema({
  email: { type: String, index: true, unique: true },
  passwordHash: String,
  type: {
    type: String,
    enum: ["SA", "NU", "SU"], // SA = SuperAdmin, NU = NormalUser, SU = SubUser
    default: "NU"
  },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const UserProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "UserAuth" },
  name: String,
  lastSeen: Date,
  meta: Schema.Types.Mixed,

});

const UserAuth = model("UserAuth", UserAuthSchema);
const UserProfile = model("UserProfile", UserProfileSchema);

module.exports = { UserAuth, UserProfile };

// TODO
// // in UserAuth schema file
// UserAuthSchema.virtual("profile", {
//   ref: "UserProfile",
//   localField: "_id",
//   foreignField: "userId",
//   justOne: true,
// });
