const UserMembership = require("../models/userMembership.model").UserMembership;
const Role = require("../models/role.model").Role;

module.exports = (permission) => async (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, error: "Unauthorized" });

  // Case: SuperAdmin → full access
  if (req.user.type === "SA" ) return next();

  // Case: NormalUser → check NormalUser role
  if (req.user.type === "NU") {
    const role = await Role.findById(req.user.roleId).lean();
    const perms = role?.permissions || [];
    if (perms.includes("*") || perms.includes(permission)) return next();
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  // Case: SubUser → check selected department membership
  if (req.user.type === "SU" && req.user.departmentId && req.user.roleId) {
    const membership = await UserMembership.findOne({
      userId: req.user._id,
      departmentId: req.user.departmentId,
      roleId: req.user.roleId,
    })
      .populate("roleId", "permissions")
      .lean();

    if (!membership)
      return res.status(403).json({ success: false, error: "Forbidden" });

    const perms = membership.roleId?.permissions || [];
    if (perms.includes("*") || perms.includes(permission)) return next();
  }

  return res.status(403).json({ success: false, error: "Forbidden" });
};
