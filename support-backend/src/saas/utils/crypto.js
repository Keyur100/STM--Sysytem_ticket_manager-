const crypto = require('crypto');

// AES-256-GCM helper using a shared secret (string)
// Exports: encrypt(obj, secret) -> { iv, tag, data } (all base64)
//          decrypt({ iv, tag, data }, secret) -> original object

function getKey(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encrypt(payload, secret) {
  if (!secret) throw new Error('Missing encryption secret');
  const key = getKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

function decrypt(obj, secret) {
  if (!secret) throw new Error('Missing decryption secret');
  const key = getKey(secret);
  const iv = Buffer.from(obj.iv, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const encrypted = Buffer.from(obj.data, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// HASH helper for HMAC signatures
function generateSignature(secret, timestamp, body) {
  const payload = `${timestamp}.${JSON.stringify(body)}`;

  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function verifySignature(secret, timestamp, body, receivedSignature) {
  const expected = generateSignature(secret, timestamp, body);

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(receivedSignature)
  );
}
module.exports = { encrypt, decrypt, generateSignature,
  verifySignature, };
