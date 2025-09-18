const { default: mongoose } = require("mongoose");
const { UserAuth, UserProfile } = require("../models/user.model");
const UserMembership = require("../models/userMembership.model").UserMembership;
const { sendSuccess, sendError } = require("../utils/response");
const { hashPassword, comparePassword } = require("../utils/bcrypt");
const { Role } = require("../models/role.model");
const { Department } = require("../models/department.model");

// Create Edit User
// Rules:

// At least one membership is required.

// Exactly one membership must be primary (isPrimary: true).

// Same role+department combo cannot be added twice.

// A department can only have one role (but a role can exist across multiple departments).

// Max 5 memberships per user.
// Create User
async function createUser(req, res) {
  try {
    const { email, password, name, memberships = [] } = req.validatedBody || req.body;

    // 0. Check if email already exists
    const existingUser = await UserAuth.findOne({ email, isDeleted: { $ne: true } });
    if (existingUser) {
      return sendError(res, 400, "Email already in use");
    }

    // 1. Hash password
    const hash = await hashPassword(password);

    // 2. Create user auth & profile
    const user = await UserAuth.create({ email, passwordHash: hash, type: "SU" });
    await UserProfile.create({ userId: user._id, name });

    // 3. Validate memberships
    if (!Array.isArray(memberships) || memberships.length === 0) {
      throw new Error("At least one membership is required");
    }
    if (memberships.length > 5) throw new Error("Maximum 5 memberships allowed");

    const seenDept = new Set();
    const seenCombo = new Set();
    let primaryCount = 0;

    const membershipDocs = memberships.map((m) => {
      if (!m.role || !m.department) throw new Error("Each membership must have role and department");

      const comboKey = `${m.role}_${m.department}`;
      if (seenCombo.has(comboKey)) throw new Error("Duplicate role+department not allowed");
      seenCombo.add(comboKey);

      if (seenDept.has(m.department)) throw new Error("Only one role allowed per department");
      seenDept.add(m.department);

      if (m.isPrimary) primaryCount++;

      return {
        userId: user._id,
        roleId: m.role,
        departmentId: m.department,
        isPrimary: !!m.isPrimary,
      };
    });

    if (primaryCount !== 1) throw new Error("Exactly one membership must be primary");

    // 4. Insert memberships
    await UserMembership.insertMany(membershipDocs);

    return sendSuccess(res, { _id: user._id, email: user.email, name }, "User created");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}

// List Users
async function listUsers(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "asc",
    } = req.query;
    const items = await UserAuth.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "userprofiles", // collection name (check case-sensitive)
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      ...(search?.trim()
        ? [
            {
              $match: {
                "profile.name": { $regex: search.trim(), $options: "i" },
              },
            },
          ]
        : []),
      {
        $sort: {
          [sortBy === "name" ? "profile.name" : sortBy]:
            sortOrder === "desc" ? -1 : 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 1,
          email: 1,
          createdAt: 1,
          // auth fields
          // flatten profile fields
          name: "$profile.name",
          phone: "$profile.phone",
        },
      },
    ]);

    const total = await UserAuth.countDocuments({ isDeleted: false });

    return sendSuccess(res, {
      items,
      total,
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// Update User
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { email, password, name, memberships = [] } = req.validatedBody || req.body;

    const user = await UserAuth.findById(id);
    if (!user) throw new Error("User not found");

    // 0. Email check
    if (email && email !== user.email) {
      const emailExists = await UserAuth.findOne({ email, _id: { $ne: id }, isDeleted: { $ne: true } });
      if (emailExists) return sendError(res, 400, "Email already in use");
      user.email = email;
    }

    // 1. Password update
    if (password) user.passwordHash = await hashPassword(password);
    await user.save();

    // 2. Profile update
    const profile = await UserProfile.findOne({ userId: id });
    if (profile && name) {
      profile.name = name;
      await profile.save();
    }

    // 3. Memberships validation
    if (memberships.length > 0) {
      if (memberships.length > 5) throw new Error("Maximum 5 memberships allowed");

      const seenDept = new Set();
      const seenCombo = new Set();
      let primaryCount = 0;

      const membershipDocs = memberships.map((m) => {
        if (!m.role || !m.department) throw new Error("Each membership must have role and department");

        const comboKey = `${m.role}_${m.department}`;
        if (seenCombo.has(comboKey)) throw new Error("Duplicate role+department not allowed");
        seenCombo.add(comboKey);

        if (seenDept.has(m.department)) throw new Error("Only one role allowed per department");
        seenDept.add(m.department);

        if (m.isPrimary) primaryCount++;

        return {
          userId: id,
          roleId: m.role,
          departmentId: m.department,
          isPrimary: !!m.isPrimary,
        };
      });

      if (primaryCount !== 1) throw new Error("Exactly one membership must be primary");

      await UserMembership.deleteMany({ userId: id });
      await UserMembership.insertMany(membershipDocs);
    }

    return sendSuccess(res, { _id: user._id, email: user.email, name }, "User updated");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}

// Delete User (Hard Delete) TODO -assign tickte to another user of same departmnet with least ticket
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // 1. Delete user auth
    const user = await UserAuth.findByIdAndDelete(id);
    if (!user) throw new Error("User not found");

    // 2. Delete user profile
    await UserProfile.deleteOne({ userId: id });

    // 3. Delete memberships
    await UserMembership.deleteMany({ userId: id });

    return sendSuccess(res, null, "User deleted successfully");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}


// Get a single user by ID
async function getUser(req, res) {
  try {
    const { id } = req.params||req.user._id;

    // 1. Get user auth
    const user = await UserAuth.findOne({ _id: id, isDeleted: false }).lean();
    if (!user) throw new Error("User not found");

    // 2. Get profile
    const profile = await UserProfile.findOne({ userId: id }).lean();

    // 3. Get memberships (populate role + department)
    const memberships = await UserMembership.find({ userId: id })
      .populate("roleId", "_id name")
      .populate("departmentId", "_id name")
      .lean();

    return sendSuccess(res, {
      _id: user._id,
      email: user.email,
      name: profile?.name || "",
      memberships,
    });
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}

// Update user (only name editable)
async function selfUpdateUser(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const profile = await UserProfile.findOne({ userId: id });
    if (!profile) throw new Error("User profile not found");

    profile.name = name;
    await profile.save();

    return sendSuccess(res, { name: profile.name }, "Profile updated");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}


async function getTicketAssignableDeptWiseMembers  (req, res)  {
  try {
    const { id:deptId } = req.params; // or req.query depending on your route

    if (!deptId) {
      return res.status(400).json({ success: false, message: "Department ID required" });
    }

   const memberships = await UserMembership.aggregate([
  // 1. Match by department
  {
    $match: { departmentId: new mongoose.Types.ObjectId(deptId) },
  },

  // 2. Lookup user (auth info)
  {
    $lookup: {
      from: "userauths",
      localField: "userId",
      foreignField: "_id",
      as: "user",
    },
  },
  { $unwind: "$user" },

  // 3. Lookup user profile (for name)
  {
    $lookup: {
      from: "userprofiles",
      localField: "userId",
      foreignField: "userId",
      as: "profile",
    },
  },
  { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

  // 4. Lookup role
  {
    $lookup: {
      from: "roles",
      localField: "roleId",
      foreignField: "_id",
      as: "role",
    },
  },
  { $unwind: "$role" },

  // 5. Only active + not deleted users
  {
    $match: {
      "user.isDeleted": false,
      "user.isActive": true,
    },
  },

  // 6. Only roles with ticket.assign or *
  {
    $match: {
      $or: [
        { "role.permissions": "ticket.assign" },
        { "role.permissions": "*" },
      ],
    },
  },

  // 7. Only output needed fields
  {
    $project: {
      _id: 0,
      userId: "$user._id",
      name: "$profile.name",
    },
  },
]);


    
    return sendSuccess(res,memberships);
  } catch (error) {
    return sendError(res, 500, err.message);

  }
};

// 🔹 New: reset password
async function resetPassword(req,res) {
  const {oldPassword,newPassword} = req.body
  const userId = req.user._id
  const user = await UserAuth.findById(userId);
  if (!user) throw new Error("User not found");

  const valid = await comparePassword(oldPassword, user.passwordHash);
  if (!valid) throw new Error("Old password is incorrect");

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  return sendSuccess(res, {}, "Password updated");

}
module.exports ={
  createUser,
  getUser,
  deleteUser,
  updateUser,
  listUsers,
resetPassword,
selfUpdateUser,
getTicketAssignableDeptWiseMembers

}

// transaction flow
// const { default: mongoose } = require("mongoose");
// const { UserAuth, UserProfile } = require("../models/user.model");
// const UserMembership = require("../models/userMembership.model").UserMembership;
// const { parsePagination } = require("../utils/pagination");
// const { sendSuccess, sendError } = require("../utils/response");
// const { hashPassword } = require("../utils/bcrypt");

// async function createUser(req, res) {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { email, password, name, memberships = [] } = req.validatedBody || req.body;

//     // 1. Hash password
//     const hash =  await hashPassword(password)

//     // 2. Create user auth & profile
//     const user = await UserAuth.create([{ email, passwordHash: hash, type:"SU" }], { session });
//     await UserProfile.create([{ userId: user[0]._id, name }], { session });

//     // 3. Prepare valid memberships (must have both role & department)
//     const validMemberships = memberships.filter(m => m.role && m.department);

//     if (validMemberships.length === 0) {
//       throw new Error("At least one membership with role and department is required");
//     }

//     // 4. Fetch all roles & departments in advance
//     const roleNames = validMemberships.map(m => m.role);
//     const deptNames = validMemberships.map(m => m.department);

//     const roles = await Role.find({ name: { $in: roleNames } }, "_id name").lean();
//     const departments = await Department.find({ name: { $in: deptNames } }, "_id name").lean();

//     const roleMap = Object.fromEntries(roles.map(r => [r.name, r._id]));
//     const deptMap = Object.fromEntries(departments.map(d => [d.name, d._id]));

//     // 5. Prepare membership documents
//     let primarySet = false;
//     const membershipDocs = validMemberships
//       .map(m => {
//         const roleId = roleMap[m.role];
//         const deptId = deptMap[m.department];
//         if (!roleId || !deptId) return null; // skip invalid entries

//         const isPrimary = !primarySet && (m.isPrimary || false);
//         if (isPrimary) primarySet = true;

//         return {
//           userId: user[0]._id,
//           roleId,
//           departmentId: deptId,
//           isPrimary
//         };
//       })
//       .filter(Boolean);

//     // 6. Insert memberships in bulk
//     await UserMembership.insertMany(membershipDocs, { session });

//     // 7. Commit transaction
//     await session.commitTransaction();
//     session.endSession();

//     return sendSuccess(res, { _id: user[0]._id, email: user[0].email, name }, "User created");
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     return sendError(res, 400, err.message);
//   }
// }


// // controllers/userController.js
// async function listUsers(req, res) {
//   try {
//     const { page = 1, limit = 10 } = req.query;
//     const skip = (page - 1) * limit;
//     const search = req.query.search?.trim();

//     // build profile query
//     const profileQuery = { isDeleted: false }; // ✅ filter out deleted profiles
//     if (search) {
//       profileQuery.name = { $regex: search, $options: "i" };
//     }

//     // find matching profiles
//     const profiles = await UserProfile.find(profileQuery)
//       .skip(skip)
//       .limit(Number(limit))
//       .lean();

//     // total count (for pagination)
//     const total = await UserProfile.countDocuments(profileQuery);

//     // fetch corresponding auth records
//     const userIds = profiles.map((p) => p.userId);
//     const auths = await UserAuth.find({ _id: { $in: userIds }, isDeleted: false }).lean(); // ✅ filter deleted users

//     const authMap = auths.reduce((acc, a) => {
//       acc[a._id.toString()] = a;
//       return acc;
//     }, {});

//     // merge data
//     const items = profiles
//       .filter((p) => authMap[p.userId.toString()]) // ensure auth exists
//       .map((p) => ({
//         ...authMap[p.userId.toString()],
//         ...p,
//       }));

//     return sendSuccess(res, {
//       items,
//       total,
//       page: Number(page),
//       limit: Number(limit),
//     });
//   } catch (err) {
//     return sendError(res, 500, err.message);
//   }
// }

// /**
//  * Edit / Update User
//  */
// async function updateUser(req, res) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const { id } = req.params;
//     const { email, password, name, memberships = [] } = req.validatedBody || req.body;

//     const user = await UserAuth.findById(id).session(session);
//     if (!user) throw new Error("User not found");

//     // 1. Update Auth info
//     if (email) user.email = email;
//     if (password) user.passwordHash =  await hashPassword(password)
//     await user.save({ session });

//     // 2. Update Profile
//     const profile = await UserProfile.findOne({ userId: id }).session(session);
//     if (profile && name) {
//       profile.name = name;
//       await profile.save({ session });
//     }

//     // 3. Update Memberships if provided
//     if (memberships.length > 0) {
//       // remove old memberships
//       await UserMembership.deleteMany({ userId: id }).session(session);

//       const validMemberships = memberships.filter(m => m.role && m.department);
//       if (validMemberships.length === 0)
//         throw new Error("At least one valid membership with role and department is required");

//       // fetch role & dept ids
//       const roleNames = validMemberships.map(m => m.role);
//       const deptNames = validMemberships.map(m => m.department);
//       const roles = await Role.find({ _id: { $in: roleNames } }, "_id").lean();
//       const departments = await Department.find({ _id: { $in: deptNames } }, "_id").lean();

//       const roleMap = Object.fromEntries(roles.map(r => [r._id.toString(), r._id]));
//       const deptMap = Object.fromEntries(departments.map(d => [d._id.toString(), d._id]));

//       let primarySet = false;
//       const membershipDocs = validMemberships
//         .map(m => {
//           const roleId = roleMap[m.role];
//           const deptId = deptMap[m.department];
//           if (!roleId || !deptId) return null;

//           const isPrimary = !primarySet && (m.isPrimary || false);
//           if (isPrimary) primarySet = true;

//           return { userId: id, roleId, departmentId: deptId, isPrimary };
//         })
//         .filter(Boolean);

//       await UserMembership.insertMany(membershipDocs, { session });
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return sendSuccess(res, { _id: user._id, email: user.email, name }, "User updated");
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     return sendError(res, 400, err.message);
//   }
// }


// /**
//  * Delete User
//  */
// async function deleteUser(req, res) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const { id } = req.params;

//     const user = await UserAuth.findById(id).session(session);
//     if (!user) throw new Error("User not found");

//     // Soft delete by default
//     user.isDeleted = true;
//     await user.save({ session });

//     // Also soft delete profile
//     const profile = await UserProfile.findOne({ userId: id }).session(session);
//     if (profile) profile.isDeleted = true;
//     await profile.save({ session });

//     // Optionally delete memberships
//     await UserMembership.deleteMany({ userId: id }).session(session);

//     await session.commitTransaction();
//     session.endSession();

//     return sendSuccess(res, null, "User deleted successfully");
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     return sendError(res, 400, err.message);
//   }
// }

// module.exports = { createUser, listUsers, updateUser, deleteUser };
