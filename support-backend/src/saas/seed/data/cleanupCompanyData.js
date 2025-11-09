// scripts/deleteAllData.js

const mongoose = require("mongoose");
// const env = require("../config/env"); // adjust the path to your env file

// Import all your models
const Company = require("../../models/company.model");
const Subscription = require("../../models/subscription.model");
const Order = require("../../models/order.model");
const Payment = require("../../models/payment.model");
const Wallet = require("../../models/wallet.model");

(async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/support_ticket");
    console.log("✅ Connected to MongoDB");

    // Delete all records from each collection
    await Promise.all([
      Company.deleteMany({}),
      Subscription.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
      Wallet.deleteMany({}),
    ]);

    console.log(`
🧹 Cleanup Complete:
  - All Companies deleted
  - All Subscriptions deleted
  - All Orders deleted
  - All Payments deleted
  - All Wallets deleted
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting data:", error);
    process.exit(1);
  }
})();
