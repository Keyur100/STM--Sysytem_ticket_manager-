// backend/src/utils/response.js
function sendSuccess(res, data = null, message = "OK", meta = {}) {
  return res.json({ success: true, message, data, meta });
}
function sendError(res, status = 400, error = "Error") {
  if (typeof status === "string") {
    error = status;
    status = 400;
  }
  return res
    .status(status)
    .json({
      success: false,
      error: typeof error === "string" ? error : error.message || error,
    });
}
module.exports = { sendSuccess, sendError };
