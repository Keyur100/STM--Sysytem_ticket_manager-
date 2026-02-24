# 🔐 SaaS Sync Encryption Protocol

## Overview

This document describes the secure encryption protocol used for synchronizing data between the Node.js backend and the 3rd-party Laravel application using AES-256-GCM encryption with a shared secret.

---

## Encryption Specification

### Algorithm: AES-256-GCM

- **Cipher**: AES (Advanced Encryption Standard)
- **Key Size**: 256 bits
- **Mode**: GCM (Galois/Counter Mode) - provides both confidentiality and authenticity
- **IV Size**: 96 bits (12 bytes)
- **Tag Size**: 128 bits (16 bytes)

### Key Derivation

```javascript
// Node.js / JavaScript
const crypto = require('crypto');
function getKey(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}
```

```php
// Laravel / PHP
function getKey($secret) {
  return hash('sha256', $secret, true);
}
```

The shared secret is hashed using SHA-256 to derive a 256-bit encryption key.

---

## Encryption Process

### Node.js Implementation

```javascript
const crypto = require('crypto');

function encrypt(payload, secret) {
  const key = crypto.createHash('sha256').update(String(secret)).digest();
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
  const key = crypto.createHash('sha256').update(String(secret)).digest();
  const iv = Buffer.from(obj.iv, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const encrypted = Buffer.from(obj.data, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}
```

### Laravel / PHP Implementation

```php
<?php

class CryptoUtil {
  /**
   * Encrypt payload using AES-256-GCM
   */
  public static function encrypt($payload, $secret) {
    $key = hash('sha256', $secret, true);
    $iv = openssl_random_pseudo_bytes(12);
    $plaintext = json_encode($payload);

    $tag = '';
    $encrypted = openssl_encrypt(
      $plaintext,
      'aes-256-gcm',
      $key,
      OPENSSL_RAW_DATA,
      $iv,
      $tag
    );

    return [
      'iv' => base64_encode($iv),
      'tag' => base64_encode($tag),
      'data' => base64_encode($encrypted),
    ];
  }

  /**
   * Decrypt encrypted payload
   */
  public static function decrypt($encrypted_data, $secret) {
    $key = hash('sha256', $secret, true);
    $iv = base64_decode($encrypted_data['iv']);
    $tag = base64_decode($encrypted_data['tag']);
    $data = base64_decode($encrypted_data['data']);

    $plaintext = openssl_decrypt(
      $data,
      'aes-256-gcm',
      $key,
      OPENSSL_RAW_DATA,
      $iv,
      $tag
    );

    if ($plaintext === false) {
      throw new Exception('Decryption failed - authentication tag mismatch');
    }

    return json_decode($plaintext, true);
  }
}

?>
```

---

## Request/Response Format

### Encrypted Request (Node.js → Laravel)

```javascript
// Frontend or Backend sends encrypted payload to Laravel
POST https://laravel-api.example.com/sync/company

{
  "payload": {
    "iv": "base64_encoded_iv",
    "tag": "base64_encoded_tag",
    "data": "base64_encoded_encrypted_data"
  }
}
```

**Decrypted Payload Example**:
```json
{
  "company": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "status": "active"
  },
  "plan": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Professional",
    "price": 5000,
    "billingCycle": "monthly"
  },
  "subscriptions": [...],
  "orders": [...],
  "addons": [...]
}
```

### Encrypted Response (Laravel → Node.js)

```json
{
  "payload": {
    "iv": "base64_encoded_iv",
    "tag": "base64_encoded_tag",
    "data": "base64_encoded_encrypted_data"
  }
}
```

**Decrypted Response Example**:
```json
{
  "success": true,
  "message": "Data synced successfully",
  "syncedAt": "2026-02-06T10:30:00Z",
  "recordsUpdated": 42
}
```

---

## Environment Configuration

### Node.js Backend (.env)

```env
# Sync Configuration
SYNC_API_SECRET=your-super-secret-shared-key-min-32-chars-long
SYNC_REMOTE_URL=https://laravel-api.example.com/api/sync/company
SAAS_TICKETS_URL=https://laravel-api.example.com/api/sync/tickets
```

### Laravel Backend (.env)

```env
# Sync Configuration
SYNC_API_SECRET=your-super-secret-shared-key-min-32-chars-long
ALLOWED_SYNC_ORIGINS=https://node-api.example.com,https://frontend.example.com
```

---

## Security Best Practices

1. **Shared Secret Management**
   - Use a strong, randomly generated secret (minimum 32 characters)
   - Store in environment variables, never in code
   - Rotate secrets periodically
   - Use different secrets for different environments (dev, staging, prod)

2. **Authentication & Authorization**
   - Require JWT token in the Authorization header on Node.js endpoints
   - Validate IP whitelist on Laravel endpoints
   - Log all sync attempts (successful and failed)

3. **Error Handling**
   - Never expose decryption errors to the client
   - Log decryption failures for security audits
   - Return generic error messages ("Sync failed") to clients

4. **Rate Limiting**
   - Implement rate limiting on sync endpoints
   - Suggested limit: 10 requests per minute per API key
   - Use exponential backoff for retries

5. **Data Validation**
   - Validate all decrypted data before processing
   - Verify data integrity checksums if available
   - Sanitize all input fields

---

## API Endpoint Examples

### Node.js → Laravel

**Endpoint**: `POST /api/sync/company`

```bash
curl -X POST https://laravel-api.example.com/api/sync/company \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "iv": "...",
      "tag": "...",
      "data": "..."
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "payload": {
    "iv": "...",
    "tag": "...",
    "data": "..."
  }
}
```

### Laravel → Node.js (Ticket Sync)

**Endpoint**: `GET /saas/ticket-sync`

Node.js Backend makes encrypted request to Laravel:
```bash
curl -X POST https://laravel-api.example.com/api/sync/tickets/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "payload": {
      "iv": "...",
      "tag": "...",
      "data": "..."
    }
  }'
```

---

## Testing Encryption

### Node.js Test

```javascript
const { encrypt, decrypt } = require('./crypto');

const secret = 'test-secret-key-32-chars-minimum';
const payload = { company: 'Acme', id: 123 };

// Encrypt
const encrypted = encrypt(payload, secret);
console.log('Encrypted:', encrypted);

// Decrypt
const decrypted = decrypt(encrypted, secret);
console.log('Decrypted:', decrypted);
console.log('Match:', JSON.stringify(payload) === JSON.stringify(decrypted));
```

### Laravel Test

```php
<?php

$secret = 'test-secret-key-32-chars-minimum';
$payload = ['company' => 'Acme', 'id' => 123];

// Encrypt
$encrypted = CryptoUtil::encrypt($payload, $secret);
echo 'Encrypted: ' . json_encode($encrypted) . "\n";

// Decrypt
$decrypted = CryptoUtil::decrypt($encrypted, $secret);
echo 'Decrypted: ' . json_encode($decrypted) . "\n";
echo 'Match: ' . (json_encode($payload) === json_encode($decrypted) ? 'true' : 'false');

?>
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Decryption failed" | Wrong secret key | Verify SYNC_API_SECRET matches on both systems |
| "Authentication tag mismatch" | Data was corrupted in transit | Check network security, enable HTTPS |
| "Invalid JSON" | Payload encoding issue | Ensure UTF-8 encoding before encryption |
| "IV size mismatch" | IV not 12 bytes | Check IV generation (should be exactly 12 bytes) |

---

## References

- [NIST SP 800-38D: GCM](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [PHP OpenSSL Functions](https://www.php.net/manual/en/ref.openssl.php)
- [OWASP Encryption Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Encryption_Cheat_Sheet.html)
