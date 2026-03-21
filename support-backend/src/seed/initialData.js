require("dotenv").config();

const { connectMongoose } = require("../models/mongoose");

const { Role } = require("../models/role.model");
const { Department } = require("../models/department.model");
const { UserAuth, UserProfile } = require("../models/user.model");
const { UserMembership } = require("../models/userMembership.model");
const { Tag } = require("../models/tag.model");

const bcrypt = require("bcrypt");


// ==============================
// Seed Roles
// ==============================
async function seedRoles() {

  console.log("🚀 Seeding Roles...");

  const roles = [
    { name: "SuperAdmin", permissions: ["*"], isSystem: true },
    { name: "Admin", permissions: ["*"], isSystem: true },

    {
      name: "Agent",
      permissions: [
        "user.self_update",
        "user.reset_password",
        "user.self_read",
        "ticket.department_read",
        "department.read",
        "tag.read",
        "ticket.read",
        "ticket.reply",
        "ticket.update",
        "ticket.assign",
      ],
      isSystem: true,
    },

    {
      name: "Manager",
      permissions: [
        "user.self_update",
        "user.reset_password",
        "user.self_read",
        "ticket.department_read",
        "department.read",
        "tag.read",
        "ticket.read",
        "ticket.assign",
        "ticket.escalate",
        "ticket.update",
      ],
      isSystem: true,
    },

    {
      name: "NormalUser",
      permissions: [
        "user.self_update",
        "user.reset_password",
        "user.self_read",
        "ticket.reopen",
        "department.read",
        "tag.read",
        "ticket.create",
        "ticket.read",
      ],
      isSystem: true,
    },
  ];

  for (const role of roles) {

    await Role.updateOne(
      { name: role.name },
      { $set: role },
      { upsert: true, setDefaultsOnInsert: true }
    );

  }

  console.log("✅ Roles seeded");
}



// ==============================
// Seed Departments
// ==============================
async function seedDepartments() {

  console.log("🚀 Seeding Departments...");

  const departments = [
    { name: "Support", isSystem: true, hidden: false },
    { name: "Billing", isSystem: true, hidden: false },
    { name: "Infrastructure", isSystem: true, hidden: false },
  ];

  for (const dept of departments) {

    await Department.updateOne(
      { name: dept.name },
      { $set: dept },
      { upsert: true, setDefaultsOnInsert: true }
    );

  }

  console.log("✅ Departments seeded");
}



// ==============================
// Seed Tags
// ==============================
async function seedTags() {

  console.log("🚀 Seeding Tags...");

  const tags = [
    { name: "payment", slug: "payment", isSystem: true },
    { name: "bug", slug: "bug", isSystem: true },
    { name: "feature", slug: "feature", isSystem: true },
    { name: "urgent", slug: "urgent", isSystem: true },
  ];

  for (const tag of tags) {

    await Tag.updateOne(
      { slug: tag.slug },
      { $set: tag },
      { upsert: true, setDefaultsOnInsert: true }
    );

  }

  console.log("✅ Tags seeded");
}



// ==============================
// Seed SuperAdmin User
// ==============================
async function seedSuperAdmin() {

  console.log("🚀 Seeding SuperAdmin...");

  const superAdminEmail =
    process.env.SUPERADMIN_EMAIL || "superadmin@example.com";

  const superAdminPass =
    process.env.SUPERADMIN_PASS || "SuperSecret1!";

  let user = await UserAuth.findOne({ email: superAdminEmail });

  // Create if not exists
  if (!user) {

    const hash = await bcrypt.hash(superAdminPass, 10);

    user = await UserAuth.create({
      email: superAdminEmail,
      passwordHash: hash,
      type: "SA",
    });

    await UserProfile.updateOne(
      { userId: user._id },
      { $set: { name: "Super Admin" } },
      { upsert: true }
    );

    const superRole = await Role.findOne({ name: "SuperAdmin" });

    await UserMembership.updateOne(
      { userId: user._id },
      {
        $set: {
          roleId: superRole._id,
          isPrimary: true,
        },
      },
      { upsert: true }
    );

    console.log("✅ SuperAdmin created");

  } else {

    console.log("ℹ️ SuperAdmin already exists");

  }

}



// ==============================
// Run Seeder
// ==============================
(async () => {

  try {

    console.log("🚀 Starting Initial Seeder...");

    await connectMongoose(process.env.MONGO_URI);

    await seedRoles();
    await seedDepartments();
    await seedTags();
    await seedSuperAdmin();

    console.log("🎉 Initial data seeded successfully");

    process.exit(0);

  } catch (err) {

    console.error("❌ Seeder error:", err);
    process.exit(1);

  }

})();