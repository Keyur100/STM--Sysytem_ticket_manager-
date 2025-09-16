const logger = require("../libs/logger");
module.exports = function (err, req, res, next) {
  logger.error(err && err.stack ? err.stack : err);
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message || "Internal Server Error" });
};
