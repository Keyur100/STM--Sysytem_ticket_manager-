const axios = require('axios');
const config = require('../config/env');
const { generateSignature } = require('../utils/crypto');

async function sendSecureRequest(payload, url = null) {
  const timestamp = Date.now().toString();

  const signature = generateSignature(
    config.apiSecret,
    timestamp,
    payload
  );

  const target = url || config.remoteUrl;

  const response = await axios.post(
    target,
    payload,
    {
      timeout: config.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
    }
  );

  return response;
}

module.exports = {
  sendSecureRequest,
};