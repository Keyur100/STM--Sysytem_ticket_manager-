const { encrypt } = require('./crypto');
const config = require('../config/env');

function generateSecurityKey() {

  // encrypt the secret itself
  const encrypted = encrypt(
    config.apiSecret,
    config.apiSecret
  );

  // convert to base64 JSON
  const json = JSON.stringify(encrypted);

  return Buffer.from(json).toString('base64');
}

module.exports = { generateSecurityKey };