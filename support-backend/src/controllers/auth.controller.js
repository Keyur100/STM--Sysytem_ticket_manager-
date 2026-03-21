const { sendSuccess, sendError } = require("../utils/response");
const authService = require("../services/auth/auth.service");
// NA
async function register(req, res, next) {
  try {
    const result = await authService.register(req.validatedBody || req.body);
    return sendSuccess(res, result);
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
async function selectDepartment(req, res) {
  try {
    const result = await authService.selectDepartment( {userId:req.body.userId,departmentId:req.body.departmentId});
    return sendSuccess(res, result, "Logged in");
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}
 

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return sendSuccess(res, result, 'Password reset email sent if account exists');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPasswordByToken(token, newPassword);
    return sendSuccess(res, result, 'Password updated');
  } catch (err) {
    return sendError(res, 400, err.message);
  }
}

module.exports = { register, login, refreshToken, logout, selectDepartment, forgotPassword, resetPassword };
