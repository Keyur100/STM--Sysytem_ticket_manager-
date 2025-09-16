require("dotenv").config();
const { connectMongoose } = require("../models/mongoose");
const Role = require("../models/role.model").Role;
const Department = require("../models/department.model").Department;
const UserAuth = require("../models/user.model").UserAuth;
const UserProfile = require("../models/user.model").UserProfile;
const UserMembership = require("../models/userMembership.model").UserMembership;
const Tag = require("../models/tag.model").Tag;

(async () => {
  await connectMongoose(process.env.MONGO_URI);
  // SU- haveing "department.read" must be bcz when they are login at taht time "department.read" will be mandatory due to department fetch list//ticket.* will do, if (perms.includes("*")) return "/dashboard"; // superadmin default  in public,protected route
  const roles = [
    { name: "SuperAdmin", permissions: ["*"], isSystem: true },
    { name: "Admin", permissions: ["*"], isSystem: true },
    { name: "Agent", permissions: ["user.self_update","user.reset_password","user.self_read","ticket.department_read","department.read","tag.read","ticket.department_read","ticket.read", "ticket.reply", "ticket.update", "ticket.assign"], isSystem: true },
    { name: "Manager", permissions: ["user.self_update","user.reset_password","user.self_read","ticket.department_read","department.read","tag.read","ticket.department_read","ticket.read", "ticket.assign", "ticket.escalate", "ticket.update"], isSystem: true },
    { name: "NormalUser", permissions: ["user.self_update","user.reset_password","user.self_read","ticket.reopen","department.read","tag.read","ticket.create", "ticket.read"], isSystem: true }
  ];//TODO AGENT<MANAGER<SENIOR_MANAGER<DIRECTORE<VP<PRESIDENT<CTO<CEO
  for (const r of roles) await Role.updateOne({ name: r.name }, { $set: r }, { upsert: true });

  const depts = [
    { name: "Support", isSystem: true,hidden:false },
    { name: "Billing", isSystem: true,hidden:false },
    { name: "Infrastructure", isSystem: true,hidden:false }
  ];
  for (const d of depts) await Department.updateOne({ name: d.name }, { $set: d }, { upsert: true });

  const tags = [
    { name: "payment", slug: "payment", isSystem: true },
    { name: "bug", slug: "bug", isSystem: true },
    { name: "feature", slug: "feature", isSystem: true },
    { name: "urgent", slug: "urgent", isSystem: true }
  ];
  for (const t of tags) await Tag.updateOne({ name: t.name }, { $set: t }, { upsert: true });

  // create superadmin user
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || "superadmin@example.com";
  const superAdminPass = process.env.SUPERADMIN_PASS || "SuperSecret1!";
  const bcrypt = require("bcrypt");
  const hash = await bcrypt.hash(superAdminPass, 10);
  let user = await UserAuth.findOne({ email: superAdminEmail }).lean();
  if (!user) {
    user = await UserAuth.create({ email: superAdminEmail, passwordHash: hash,type:"SA" });
    await UserProfile.create({ userId: user._id, name: "Super Admin" }); 
    const superRole = await Role.findOne({ name: "SuperAdmin" });
    await UserMembership.create({ userId: user._id, roleId: superRole._id, isPrimary: true });
  }
  console.log("Seeded initial data (roles, departments, tags, superadmin)");
  process.exit(0);
})();
