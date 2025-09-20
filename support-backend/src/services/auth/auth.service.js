const { UserAuth, UserProfile } = require("../../models/user.model");
const { signAccess, signRefresh, saveRefreshToken, revokeRefreshToken, issueTokensAndReturn, verifyRefreshToken } = require("../../utils/token.service");
const { UserMembership } = require("../../models/userMembership.model");
const { buildUserPayload } = require("./auth.helper.service");
const { hashPassword, comparePassword } = require("../../utils/bcrypt");
const { Role } = require("../../models/role.model");
const { default: mongoose } = require("mongoose");
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

// controllers/authController.js
async function login({ email, password }) {
  const userAuth = await UserAuth.findOne({ email, isDeleted: false, isActive: true }).lean();
  if (!userAuth) throw new Error("Invalid email or password");

  const valid = await comparePassword(password, userAuth.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  const user = await buildUserPayload(userAuth); // contains profile with `name`

  // SuperAdmin
  if (userAuth.type === "SA") {
    const roleData = await Role.findOne({ name: "SuperAdmin", isSystem: true }).lean();
    if (!roleData) throw new Error("SuperAdmin role not found. Contact admin.");

    return issueTokensAndReturn(userAuth, roleData, "SA", user, false);
  }

  // NormalUser
  if (userAuth.type === "NU") {
    const roleData = await Role.findOne({ name: "NormalUser", isSystem: true }).lean();
    if (!roleData) throw new Error("NormalUser role not found. Contact admin.");

    return issueTokensAndReturn(userAuth, roleData, "NU", user, false);
  }

  // SubUser → must select department later
  if (userAuth.type === "SU") {
    const memberships = await UserMembership.find({ userId: userAuth._id })
      .populate("roleId", "name")
      .populate("departmentId", "name")
      .lean();

    if (!memberships.length) throw new Error("No department assigned. Contact admin.");

    return {
      user,
      memberships,  // frontend will use this for department selection
      needDepartment: true
    };
  }
}


async function selectDepartment({ userId, departmentId }) {
const [membership] = await UserMembership.aggregate([
    {
      $match: {
        userId:  new mongoose.Types.ObjectId(userId),
        departmentId:  new mongoose.Types.ObjectId(departmentId)
      }
    },
    {
      $lookup: {
        from: 'roles',
        localField: 'roleId',
        foreignField: '_id',
        as: 'role'
      }
    },
    { $unwind: { path: '$role' } },
    {
      $lookup: {
        from: 'departments',
        localField: 'departmentId',
        foreignField: '_id',
        as: 'department'
      }
    },
    { $unwind: { path: '$department' } },
    {
      $lookup: {
        from: 'userauths',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user' } },
    {
      $lookup: {
        from: 'userprofiles',
        localField: 'user._id',
        foreignField: 'userId',
        as: 'profile'
      }
    },
    { $unwind: { path: '$profile' } },
    {
      $project: {
        email: '$user.email',
        roleId: '$role._id',
        departmentName: '$department.name',
        name: '$profile.name',
        roles:"$role"
      }
    }
  ]);


  if (!membership) throw new Error("Invalid department selection");

  const payload = {
    _id: userId,
    email: membership?.email,
    type: "SU",
    departmentId,
    roles:membership?.roles._id,
    name: membership?.name || "",
  };

  const access = signAccess(payload);
  const refresh = signRefresh(payload);
  await saveRefreshToken(userId.toString(), refresh);
  payload.roles = membership?.roles
  return { user:payload,access, refresh };
}



async function refresh(refreshToken) {
  // 1. Verify token
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    throw new Error("Invalid or expired refresh token" );
}
  const userId = payload._id 

  // 2. Get user auth record
  const userAuth = await UserAuth.findById(userId).lean();
  if (!userAuth) throw new Error("User missing");

  // 3. Build user payload (profile, name, etc.)
  const user = await buildUserPayload(userAuth);

  // 4. Handle based on type
  if (userAuth.type === "SA") {
    const roleData = await Role.findOne({ name: "SuperAdmin", isSystem: true }).lean();
    if (!roleData) throw new Error("SuperAdmin role not found. Contact admin.");

    return issueTokensAndReturn(userAuth, roleData, "SA", user, false);
  }

  if (userAuth.type === "NU") {
    const roleData = await Role.findOne({ name: "NormalUser", isSystem: true }).lean();
    if (!roleData) throw new Error("NormalUser role not found. Contact admin.");

    return issueTokensAndReturn(userAuth, roleData, "NU", user, false);
  }

  if (userAuth.type === "SU") {
    if (!payload.departmentId) {
      throw new Error("Department missing in token. Please login again.");
    }

    const roleData = await Role.findById(payload.roles).lean();
    if (!roleData) throw new Error("Role not found. Contact admin.");

    const newPayload = {
      _id: userAuth._id,
      email: userAuth.email,
      type: "SU",
      departmentId: payload.departmentId, // carried forward from old refresh token
      roles: roleData?._id,
      name: user?.name || "",
    };

    const access = signAccess(newPayload);
    const refreshNew = signRefresh(newPayload);
    await saveRefreshToken(userAuth._id.toString(), refreshNew);
    newPayload.roles = roleData;

    return { user:newPayload, access, refresh: refreshNew, needDepartment: false };
  }

  throw new Error("Invalid user type");
}

module.exports = { refresh };



async function logout(userId) {
  await revokeRefreshToken(userId);
}

module.exports = { register, login, refresh, logout,selectDepartment };
