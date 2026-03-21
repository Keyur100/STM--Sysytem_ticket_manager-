const path = require("path");
// load environment as soon as this module is required so other modules
// that read process.env (e.g., Razorpay init) have values available
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const mongoose = require("mongoose");
const logger = require("../../../../src/libs/logger");

let isConnected = false;

async function initWorker() {
  try {
    // Load env
    require("dotenv").config({
      path: path.resolve(__dirname, "../../../../.env")
    });

    // Prevent duplicate connection
    if (isConnected) {
      return mongoose;
    }

    const uri =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/support_ticket";

    mongoose.set("strictQuery", false);

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    isConnected = true;

    logger.info("Worker MongoDB connected");

    // graceful shutdown
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("uncaughtException", fatalError);
    process.on("unhandledRejection", fatalError);

    return mongoose;
  } catch (err) {
    logger.error("Worker MongoDB connection failed", err);
    process.exit(1);
  }
}

async function shutdown() {
  try {
    logger.info("Worker shutting down...");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error("Error during worker shutdown", err);
    process.exit(1);
  }
}

function fatalError(err) {
  logger.error("Fatal worker error", err);
  shutdown();
}

module.exports = {
  initWorker
};