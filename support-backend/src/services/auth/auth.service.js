const { UserAuth, UserProfile } = require("../../models/user.model");
const { signAccess, signRefresh, saveRefreshToken, revokeRefreshToken } = require("../../utils/token.service");
const { UserMembership } = require("../../models/userMembership.model");
const { buildUserPayload } = require("./auth.helper.service");
const { hashPassword, comparePassword } = require("../../utils/bcrypt");
const { Role } = require("../../models/role.model");
// for normal user register
async function register({ email, password, name }) {
  // Check if email exists
  const exists = await UserAuth.findOne({ email }).lean();
  if (exists) throw new Error("Email already exists");

  // Hash password and create user
  const hash = await hashPassword(password);
  const user = await UserAuth.create({ email, passwordHash: hash, type: "NU" });

  // Create user profile
  await UserProfile.create({ userId: user._id, name });

  // Assign NormalUser role
  const normalRole = await Role.findOne({ name: "NormalUser" });
  if (normalRole) {
    await UserMembership.create({ userId: user._id, roleId: normalRole._id, isPrimary: true });
  }

  // // Generate tokens
  // const access = signAccess(user);
  // const refresh = signRefresh(user);
  // await saveRefreshToken(user._id, refresh);

  return { user, };
}

async function login({ email, password }) {
  // 1. Find auth record
  const userAuth = await UserAuth.findOne({ email, isDeleted: false, isActive: true }).lean();
  if (!userAuth) throw new Error("Invalid email or password or User not Activate.");

  // 2. Check password
  const valid = await comparePassword(password, userAuth.passwordHash)
  if (!valid) throw new Error("Invalid email or password");

  // 3. Build user payload
  const user = await buildUserPayload(userAuth);

  // 4. Sign tokens
  const access = signAccess({ _id: userAuth._id, email: userAuth.email });
  const refresh = signRefresh({ _id: userAuth._id, email: userAuth.email });
  await saveRefreshToken(userAuth._id.toString(), refresh);

  // 5. Return combined response
  return { user, access, refresh };
}


async function refresh(refreshToken) {
  // 1. Verify token
  const payload = await require("../../utils/token.service").verifyRefreshToken(refreshToken);

  // 2. Get user auth record
  const userAuth = await UserAuth.findById(payload.sub).lean();
  if (!userAuth) throw new Error("User missing");

  // 3. Build user payload
  const user = await buildUserPayload(userAuth);

  // 4. Sign new tokens
  const access = signAccess({ _id: userAuth._id, email: userAuth.email });
  const refreshNew = signRefresh({ _id: userAuth._id, email: userAuth.email });
  await saveRefreshToken(userAuth._id.toString(), refreshNew);

  // 5. Return same structure as login
  return { user, access, refresh: refreshNew };
}


async function logout(userId) {
  await revokeRefreshToken(userId);
}

module.exports = { register, login, refresh, logout };
