const mongoose = require("mongoose");
const logger = require("../libs/logger");

async function connectMongoose(uri) {
  uri = uri || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/support_ticket";
  mongoose.set("strictQuery", false);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }).catch(err => {
    logger.error("Mongo connection error", err);
    process.exit(1);
  });
  logger.info("MongoDB connected");
  return mongoose;
}

module.exports = { connectMongoose, mongoose };
