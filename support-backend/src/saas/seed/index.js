require("dotenv").config();

const Plan = require("../models/plan.model");
const Module = require("../models/module.model");
const Coupon = require("../models/coupon.model");
const Addon = require("../models/addon.model");
const { UserAuth } = require("../../models/user.model");

const plansData = require("./data/plans.data");
const { allModules } = require("./data/modules.data");
const couponData = require("./data/coupons.data");
const addonData = require("./data/addon.data");

const { connectMongoose } = require("../../models/mongoose");


// ===============================
// Get Super Admin ID
// ===============================
async function getSuperAdminId() {
  const superAdmin = await UserAuth.findOne({ type: "SA" });

  if (!superAdmin) {
    throw new Error("Superadmin not found in database");
  }

  return superAdmin._id;
}


// ===============================
// Seed Modules
// ===============================
async function seedModules() {
  console.log("🚀 Seeding Modules...");

  for (const mod of allModules) {

    const actions = Array.isArray(mod.actions)
      ? mod.actions.map((a) => ({
          key: a.key,
          label: a.label,
          id: a.id,
          parentId: a.parentId,
        }))
      : [];

    const moduleData = {
      ...mod,
      actions,
    };

    await Module.updateOne(
      { moduleKey: mod.moduleKey },
      { $set: moduleData },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log("✅ Modules seeded successfully");
}



// ===============================
// Seed Plans
// ===============================
async function seedPlans() {
  console.log("🚀 Seeding Plans...");

  const allPlans = [
    ...plansData.trial,
    ...plansData.monthly,
    ...plansData.halfYearly,
    ...plansData.yearly,
    ...plansData.defaultPlan,
  ];

  for (const plan of allPlans) {
    await Plan.updateOne(
      { code: plan.code },
      { $set: plan },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log("✅ Plans seeded successfully");
}



// ===============================
// Seed Coupons
// ===============================
async function seedCoupons(superAdminId) {
  console.log("🚀 Seeding Coupons...");

  for (const coupon of couponData) {

    const couponPayload = {
      ...coupon,
      createdBy: superAdminId,
      isSystem: true,
    };

    await Coupon.updateOne(
      { code: coupon.code },
      { $set: couponPayload },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log("✅ Coupons seeded successfully");
}



// ===============================
// Seed Addons
// ===============================
async function seedAddons(superAdminId) {
  console.log("🚀 Seeding Addons...");

  for (const addon of addonData) {

    const addonPayload = {
      ...addon,
      createdBy: superAdminId,
    };

    await Addon.updateOne(
      { value: addon.value },
      { $set: addonPayload },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log("✅ Addons seeded successfully");
}



// ===============================
// Run Seeder
// ===============================
(async () => {
  try {
    console.log("🚀 Starting Database Seeding...");
    console.log("Mongo URI:", process.env.MONGO_URI);

    await connectMongoose(process.env.MONGO_URI);

    const superAdminId = await getSuperAdminId();

    await seedModules();
    await seedPlans();
    await seedCoupons(superAdminId);
    await seedAddons(superAdminId);

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);

  } catch (error) {

    console.error("❌ Seeding failed:", error);
    process.exit(1);

  }
})();