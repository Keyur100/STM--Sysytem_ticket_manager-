const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Plan = require("../models/plan.model");
const Module = require("../models/module.model");
const Coupon = require("../models/coupon.model");
const {UserAuth} = require("../../models/user.model");  // Assuming this is the collection for user authentication

// Import seed data
const plansData = require("./data/plans.data");
const { allModules } = require("./data/modules.data");
const couponData = require("./data/coupons.data"); // Import coupon data

// Connect to DB
async function connectDB() {
  await mongoose.connect("mongodb://localhost:27017/support_ticket", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("✅ MongoDB connected for seeding...");
}

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
    await Module.findOneAndUpdate(
      { moduleKey: mod.moduleKey }, // find by unique key
      { $set: mod }, // update fields
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

// Run Seeder
(async () => {
  try {
    await connectDB();
    const superAdminId = await getSuperAdminId(); // Get the superadmin ID
    await seedModules();
    await seedPlans();
    await seedCoupons(superAdminId); // Pass the superadmin ID to the coupon seeding function
    console.log("🎉 All seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding data:", err);
    process.exit(1);
  }
})();
