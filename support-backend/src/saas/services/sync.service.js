// // const axios = require('axios');
// // const config = require('../config/env');
// // const { generateSignature } = require('../utils/crypto');

// // async function sendSecureRequest(payload, url = null) {
// //   const timestamp = Date.now().toString();

// //   const signature = generateSignature(
// //     config.apiSecret,
// //     timestamp,
// //     payload
// //   );

// //   const target = url || config.remoteUrl;

// //   const response = await axios.post(
// //     target,
// //     payload,
// //     {
// //       timeout: config.requestTimeout,
// //       headers: {
// //         'Content-Type': 'application/json',
// //         // 'x-api-key': config.apiKey,
// //         // 'x-timestamp': timestamp,
// //         'x-signature': signature,
// //       },
// //     }
// //   );

// //   return response;
// // }

// // module.exports = {
// //   sendSecureRequest,
// // };

// const axios = require('axios');
// const config = require('../config/env');
// const { generateSecurityKey } = require('../utils/securityKey.js');

// async function sendSecureRequest(payload, url = null) {

//  try{
//    const target = url || config.remoteUrl;

//   const securityKey = generateSecurityKey();

//   const response = await axios.post(
//     target,
//     payload,
//     {
//       timeout: config.requestTimeout,
//       headers: {
//         'Content-Type': 'application/json',
//         'security_key': securityKey
//       }
//     }
//   );

//   return response.data;
//  }catch(err){
//   console.error('Error in sendSecureRequest:', err.message || err);
//   throw err;
//  }
// }

// module.exports = {
//   sendSecureRequest
// };

const axios = require('axios');
const config = require('../config/env');
const { generateSecurityKey } = require('../utils/securityKey.js');

async function sendSecureRequest(payload, url = null) {
  try {
    const target = url || config.remoteUrl;

    const securityKey = generateSecurityKey();

    const response = await axios.post(
      target,
      payload,
      {
        timeout: config.requestTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${securityKey}`
        }
      }
    );

    return response.data;

  } catch (err) {
    console.error(
  "❌ API Error:",
  JSON.stringify({
    message: err.response?.data?.message || err.message || String(err),
    status: err.response?.status,
    data: err.response?.data,
    url: err.config?.url,
    method: err.config?.method
  }, null, 2)
);
    throw err;
  }
}

module.exports = {
  sendSecureRequest,
};