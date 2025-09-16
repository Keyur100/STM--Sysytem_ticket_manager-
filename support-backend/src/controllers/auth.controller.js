const { sendSuccess, sendError } = require("../utils/response");
const authService = require("../services/auth/auth.service");
// NA
async function register(req, res, next) {
  try {
    const result = await authService.register(req.validatedBody || req.body);
    return sendSuccess(res, result, "Registered");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}
// all  user
async function login(req, res) {
  try {
    const result = await authService.login(req.validatedBody || req.body);
    return sendSuccess(res, result, "Logged in");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}
async function refreshToken(req, res) {
  try {
    const { refresh } = req.body;
    const tokens = await authService.refresh(refresh);
    return sendSuccess(res, tokens, "Token refreshed");
  } catch (err) {
    return sendError(res, 401, err.message);
  }
}
async function logout(req, res) {
  try {
    const userId = req.user && req.user._id;
    if (userId) await authService.logout(userId);
    return sendSuccess(res, null, "Logged out");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}
module.exports = { register, login, refreshToken, logout };
