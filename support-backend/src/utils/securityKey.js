const crypto = require('crypto');
const config = require('../config/env');

function generateSecurityKey() {
  const apiKey = config.apiKey || process.env.SYNC_API_KEY || '';
  const apiSecret = config.apiSecret || process.env.SYNC_API_SECRET || '';
  const timestamp = Date.now().toString();

  // Create HMAC signature over timestamp using apiSecret
  const hmac = crypto.createHmac('sha256', apiSecret || '');
  hmac.update(timestamp);
  const signature = hmac.digest('base64');

  const payload = {
    key: apiKey,
    ts: timestamp,
    sig: signature,
  };

  // Return base64 encoded JSON string as security_key header value
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

module.exports = { generateSecurityKey };
