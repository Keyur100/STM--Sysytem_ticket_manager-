/**
 * Seeder Script for SAAS Plans & Modules
 * Run: node src/saas/seed/seed.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Plan = require("../models/plan.model");
const Module = require("../models/module.model");

// Import seed data
const plansData = require("./data/plans.data");
const {allModules} = require("./data/modules.data");

// Connect to DB
async function connectDB() {
  await mongoose.connect("mongodb://localhost:27017/support_ticket", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log("✅ MongoDB connected for seeding...");
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
    ...plansData.defaultPlan
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

// Run Seeder
(async () => {
  try {
    await connectDB();
    await seedModules();
    await seedPlans();
    console.log("🎉 All seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding data:", err);
    process.exit(1);
  }
})();
