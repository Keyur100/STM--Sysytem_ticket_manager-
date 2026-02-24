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
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [];

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    }),
  );

  app.use(bodyParser.json());
  app.use(morgan("dev"));

  app.use("/api", routes);

  app.get("/", (req, res) =>
    res.json({ ok: true, message: "Finale Support API (merged with workers)" }),
  );

  app.use(errorHandler);

  const port = process.env.PORT || 3000;
  app.listen(port, () => logger.info(`API listening ${port}`));
})();
