const { UserProfile } = require("../../models/user.model");
const { UserMembership } = require("../../models/userMembership.model");

async function buildUserPayload(userAuth) {
  if (!userAuth) return null;

  // Fetch profile
  const profile = await UserProfile.findOne({ userId: userAuth._id }).lean();

  return {
    _id: userAuth._id,
    email: userAuth.email,
    name: profile?.name || null,
    // lastSeen: profile?.lastSeen || null,
    // meta: profile?.meta || {},
    type:userAuth.type,
    departmentId:null
  };
}


module.exports= {buildUserPayload}