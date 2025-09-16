const redis = require("redis");
let client = null;
function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    client = redis.createClient({ url });
    client.connect().catch(err => console.error("Redis connect error", err));
  }
  return client;
}
module.exports = { getRedis };
