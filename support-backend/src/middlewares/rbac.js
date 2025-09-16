const UserMembership = require("../models/userMembership.model").UserMembership;
const Role = require("../models/role.model").Role;
module.exports = (permission) => async (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, error: "Unauthorized" });
  const memberships = await UserMembership.find({ userId: req.user._id })
    .populate("roleId")
    .lean();
  for (const m of memberships) {
    const perms = (m.roleId && m.roleId.permissions) || [];
    if (perms.includes("*") || perms.includes(permission)) return next();
  }
  return res.status(403).json({ success: false, error: "Forbidden" });
};
