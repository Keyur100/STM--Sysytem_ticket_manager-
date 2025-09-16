const { UserProfile } = require("../../models/user.model");
const { UserMembership } = require("../../models/userMembership.model");

async function buildUserPayload(userAuth) {
  if (!userAuth) return null;

  // Fetch profile
  const profile = await UserProfile.findOne({ userId: userAuth._id }).lean();

  // Fetch role + department (single membership as per your rule)
  const membership = await UserMembership.findOne({ userId: userAuth._id })
    .populate({
      path: "roleId",
      select: "name permissions -_id"
    })
    .populate({
      path: "departmentId",
      select: "name -_id"
    })
    .lean();

  let roles = null;
  if (membership) {
    roles = {
      name: membership.roleId?.name || null,
      permissions: membership.roleId?.permissions || [],
      department: membership.departmentId ? membership.departmentId.name : null,
      isPrimary: membership.isPrimary || false
    };
  }

  return {
    _id: userAuth._id,
    email: userAuth.email,
    name: profile?.name || null,
    lastSeen: profile?.lastSeen || null,
    meta: profile?.meta || {},
    roles
  };
}


module.exports= {buildUserPayload}