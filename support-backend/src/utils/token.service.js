const jwt = require("jsonwebtoken");
const { getRedis } = require("../libs/redisClient");

function signAccess(user) { return jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET || "secret", { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }); }
function signRefresh(user) { return jwt.sign({ sub: String(user._id) }, process.env.JWT_REFRESH_SECRET || "refreshsecret", { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }); }

async function saveRefreshToken(userId, token) { const r = getRedis(); await r.set(`refresh:${userId}`, token, { EX: 7 * 24 * 60 * 60 }); }
async function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || "refreshsecret");
    const r = getRedis();
    const saved = await r.get(`refresh:${payload.sub}`);
    if (saved && saved === token) return payload;
    throw new Error("Invalid refresh token");
  } catch (err) {
    throw err;
  }
}
async function revokeRefreshToken(userId) { const r = getRedis(); await r.del(`refresh:${userId}`); }
module.exports = { signAccess, signRefresh, saveRefreshToken, verifyRefreshToken, revokeRefreshToken };
