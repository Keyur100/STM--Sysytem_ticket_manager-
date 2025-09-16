function sendSuccess(res, data = null, message = "OK", meta = null) { return res.json({ success: true, message, data, meta }); }
function sendError(res, status = 400, error = "Bad Request") { return res.status(status).json({ success: false, error }); }
module.exports = { sendSuccess, sendError };
