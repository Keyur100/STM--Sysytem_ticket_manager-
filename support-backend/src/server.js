require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors"); // <--- add this
const { connectMongoose } = require("./models/mongoose");
const logger = require("./libs/logger");
const routes = require("./routes/api");
const errorHandler = require("./middlewares/errorHandler");

(async () => {
  await connectMongoose(process.env.MONGO_URI);
  const app = express();

  // Enable CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // frontend URL
    // credentials: true 
  }));

  app.use(bodyParser.json());
  app.use(morgan("dev"));

  app.use("/api", routes);

  app.get("/", (req, res) => res.json({ ok: true, message: "Finale Support API (merged with workers)" }));

  app.use(errorHandler);

  const port = process.env.PORT || 3000;
  app.listen(port, () => logger.info(`API listening ${port}`));
})();
