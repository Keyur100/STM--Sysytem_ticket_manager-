require("dotenv").config();

const Plan = require("../models/plan.model");
const Module = require("../models/module.model");
const Coupon = require("../models/coupon.model");
const Addon = require("../models/addon.model");
const {UserAuth} = require("../../models/user.model");  // Assuming this is the collection for user authentication

// Import seed data
const plansData = require("./data/plans.data");
const { allModules } = require("./data/modules.data");
const couponData = require("./data/coupons.data"); // Import coupon data
const addonData = require("./data/addon.data"); // Import addon data

const { connectMongoose } = require("../../models/mongoose");

// Get Superadmin ID
async function getSuperAdminId() {
  const superAdmin = await UserAuth.findOne({ type: "SA" }); // Assuming the superadmin has a 'role' field
  if (!superAdmin) {
    throw new Error("Superadmin not found");
  }
  return superAdmin._id;
}

// Seed Modules
async function seedModules() {
  console.log("🚀 Seeding Modules...");
  for (const mod of allModules) {
    // Strip non-schema fields from actions to match ModuleSchema (only key and label are allowed)
    const actions = Array.isArray(mod.actions)
      ? mod.actions.map(a => ({ key: a.key, label: a.label,id: a.id, parentId: a.parentId })) // Keep only key and label for actions
      : [];

    const modToSet = { ...mod, actions };

    await Module.findOneAndUpdate(
      { moduleKey: mod.moduleKey }, // find by unique key
      { $set: modToSet }, // update fields with cleaned actions
      { new: true, upsert: true } // create if not exists
    );
  }
  console.log("✅ Modules seeding done");
}

// Seed Plans
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
    await Plan.findOneAndUpdate(
      { code: plan.code }, // find by plan code
      { $set: plan },
      { new: true, upsert: true }
    );
  }

  console.log("✅ Plans seeding done");
}

// Seed Coupons
async function seedCoupons(superAdminId) {
  console.log("🚀 Seeding Coupons...");

  // Update the coupon data with dynamic superAdminId
  const couponsWithSuperAdmin = couponData.map(coupon => ({
    ...coupon,
    createdBy: superAdminId,  // Assign the superadmin's ID dynamically
    isSystem: true,  // Ensure all coupons are system coupons
  }));

  for (const coupon of couponsWithSuperAdmin) {
    await Coupon.findOneAndUpdate(
      { code: coupon.code }, // find by unique coupon code
      { $set: coupon },
      { new: true, upsert: true }
    );
  }

  console.log("✅ Coupons seeding done");
}

// Seed Add-ons
async function seedAddons(superAdminId) {
  console.log("🚀 Seeding Add-ons...");
  
  try {
    // Drop old 'code' index if it exists to avoid duplicate key errors
    const collection = Addon.collection;
    const indexes = await collection.listIndexes().toArray();
    const codeIndexExists = indexes.some(idx => idx.name === 'code_1');
    
    if (codeIndexExists) {
      console.log("🔧 Removing old 'code' index...");
      await collection.dropIndex('code_1');
    }
    
    // Clear old addon data with null code values
    await Addon.deleteMany({ code: null });
  } catch (err) {
    console.log("⚠️ Note: Could not clean up old indexes (this is okay on first run)");
  }

  // Update the addon data with dynamic superAdminId
  const addonsWithSuperAdmin = addonData.map(addon => ({
    ...addon,
    createdBy: superAdminId,  // Assign the superadmin's ID dynamically
  }));

  for (const addon of addonsWithSuperAdmin) {
    await Addon.findOneAndUpdate(
      { value: addon.value }, // find by unique addon value (e.g., max_employees, storageMB)
      { $set: addon },
      { new: true, upsert: true }
    );
  }

  console.log("✅ Add-ons seeding done");
}

// Run Seeder
(async () => {
  try {
    console.log("🚀 Starting seeding process...",process.env.MONGO_URI);
    
    await connectMongoose(process.env.MONGO_URI);
    const superAdminId = await getSuperAdminId(); // Get the superadmin ID
    await seedModules();
    await seedPlans();
    await seedCoupons(superAdminId); // Pass the superadmin ID to the coupon seeding function
    await seedAddons(superAdminId); // Pass the superadmin ID to the addon seeding function
    console.log("🎉 All seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding data:", err);
    process.exit(1);
  }
})();
