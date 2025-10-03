const jwt = require("jsonwebtoken");
const { getRedis } = require("../libs/redisClient");

function signAccess(payload) {
  return jwt.sign(
    payload, 
    process.env.JWT_SECRET || "secret", 
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function signRefresh(payload) {
  return jwt.sign(
    payload, 
    process.env.JWT_REFRESH_SECRET || "refreshsecret", 
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
}

async function saveRefreshToken(userId, token) { const r = getRedis(); await r.set(`refresh:${userId}`, token, { EX: 7 * 24 * 60 * 60 }); }//7 days
async function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || "refreshsecret");
    const r = getRedis();
    const saved = await r.get(`refresh:${payload._id}`);

    if (!saved || saved !== token) {
      // Optional: remove invalid token from Redis
      if (payload._id) await r.del(`refresh:${payload._id}`);
      return null; // instead of throwing
    }

    return payload;
  } catch (err) {
    return null; // token invalid or expired
  }
}

async function revokeRefreshToken(userId) { const r = getRedis(); await r.del(`refresh:${userId}`); }

async function issueTokensAndReturn(userAuth, roleData, type, user, needDepartment = false) {
  const payload = {
    _id: userAuth._id,
    email: userAuth.email,
    type,
    roles: roleData?._id,
    departmentId: roleData?.departmentId || undefined, 
    name: user?.name || "",  //
  };

  const access = signAccess(payload);
  const refresh = signRefresh(payload);
  await saveRefreshToken(userAuth._id.toString(), refresh);
  user.roles = roleData

  return { user, access, refresh, needDepartment };
}



module.exports = { signAccess, signRefresh, saveRefreshToken, verifyRefreshToken, revokeRefreshToken,issueTokensAndReturn };
