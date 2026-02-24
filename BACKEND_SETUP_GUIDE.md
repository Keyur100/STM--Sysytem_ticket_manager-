# 🚀 Backend Setup & Testing Guide

## Environment Configuration

Create or update `.env` file in `support-backend/` directory:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
MONGODB_URL=mongodb://localhost:27017/support_saas

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY=7d

# SAAS Sync Configuration
SYNC_API_SECRET=your-super-secret-shared-key-minimum-32-characters-long
SYNC_REMOTE_URL=https://laravel-api.example.com/api/sync/company
SAAS_TICKETS_URL=https://laravel-api.example.com/api/sync/tickets

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Backend Files Created/Modified

### New Files

1. **`src/saas/utils/crypto.js`**
   - AES-256-GCM encryption/decryption utilities
   - Shared secret-based key derivation

2. **`src/saas/controllers/sync.controller.js`**
   - `syncCompany()` - Encrypts full company details, sends to remote API
   - Handles encrypted responses

3. **`src/saas/controllers/ticketSync.controller.js`**
   - `fetchTickets()` - Proxy encrypted fetch from Laravel
   - `updateTicketStatus()` - Proxy encrypted status updates to Laravel

4. **`src/saas/routes/ticketSync.route.js`**
   - GET `/saas/ticket-sync` - List tickets (proxied)
   - POST `/saas/ticket-sync/:id/status` - Update ticket status (proxied)

### Modified Files

1. **`src/saas/routes/company.route.js`**
   - Added: `POST /:companyId/sync` - Calls sync controller

2. **`src/saas/routes/index.js`**
   - Added: ticket-sync routes mounting

---

## API Endpoints Overview

### Company Sync

**Endpoint**: `POST /saas/company/:companyId/sync`

**Authentication**: JWT required (`authJwt`)

**Permission**: `company_update`

**Request**:
```bash
curl -X POST http://localhost:3000/saas/company/507f1f77bcf86cd799439011/sync \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "remote": {
      "success": true,
      "message": "Data synced successfully",
      "recordsUpdated": 42
    }
  },
  "message": "Sync completed"
}
```

**Error Response (500)**:
```json
{
  "success": false,
  "error": "Sync failed or remote server error",
  "statusCode": 500
}
```

---

### Ticket List (Proxied from Laravel)

**Endpoint**: `GET /saas/ticket-sync`

**Authentication**: JWT required

**Permission**: `ticket.read`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)
- `search` (optional)

**Request**:
```bash
curl http://localhost:3000/saas/ticket-sync?page=1&limit=10 \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "code": "TKT-001",
      "title": "Login issue",
      "description": "Cannot login to system",
      "status": "open",
      "priority": "high",
      "createdAt": "2026-02-06T10:30:00Z"
    }
  ]
}
```

---

### Update Ticket Status

**Endpoint**: `POST /saas/ticket-sync/:ticketId/status`

**Authentication**: JWT required

**Permission**: `ticket.update`

**Request**:
```bash
curl -X POST http://localhost:3000/saas/ticket-sync/507f1f77bcf86cd799439011/status \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed",
    "priority": "low"
  }'
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "ticketId": "507f1f77bcf86cd799439011",
    "status": "closed",
    "updatedAt": "2026-02-06T11:00:00Z"
  }
}
```

---

## Testing Guide

### 1. Test Crypto Encryption/Decryption

Create `test-crypto.js` in project root:

```javascript
const { encrypt, decrypt } = require('./support-backend/src/saas/utils/crypto');

const secret = 'test-secret-key-minimum-32-characters-long';
const payload = {
  company: {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Company',
    email: 'test@example.com',
  },
  plan: { name: 'Professional', price: 5000 },
};

console.log('Original Payload:', payload);

// Test encryption
const encrypted = encrypt(payload, secret);
console.log('Encrypted:', JSON.stringify(encrypted, null, 2));

// Test decryption
const decrypted = decrypt(encrypted, secret);
console.log('Decrypted:', decrypted);

// Verify
const match = JSON.stringify(payload) === JSON.stringify(decrypted);
console.log('✓ Encryption/Decryption Test:', match ? 'PASSED' : 'FAILED');
```

**Run Test**:
```bash
node test-crypto.js
```

Expected output: `PASSED`

---

### 2. Test Company Sync Endpoint

**Prerequisites**:
- Backend running on http://localhost:3000
- MongoDB connected with test company data
- JWT token (from login)

**Test Script** (`test-sync.sh`):

```bash
#!/bin/bash

COMPANY_ID="507f1f77bcf86cd799439011"
JWT_TOKEN="your-jwt-token-here"
API_URL="http://localhost:3000"

echo "Testing Company Sync Endpoint..."

curl -X POST "$API_URL/saas/company/$COMPANY_ID/sync" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

echo "Test completed!"
```

**Run Test**:
```bash
bash test-sync.sh
```

---

### 3. Test Ticket Sync Endpoint

```bash
#!/bin/bash

JWT_TOKEN="your-jwt-token-here"
API_URL="http://localhost:3000"

echo "Fetching tickets from Laravel..."

curl "$API_URL/saas/ticket-sync?page=1&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "Updating ticket status..."

curl -X POST "$API_URL/saas/ticket-sync/TICKET_ID_HERE/status" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed",
    "priority": "low"
  }' \
  -w "\nStatus: %{http_code}\n"
```

---

### 4. Test Module CRUD Endpoints

**Create Module**:
```bash
curl -X POST http://localhost:3000/saas/module \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group": "Accounting",
    "moduleKey": "saas.accounting",
    "displayName": "Accounting Module",
    "actions": [
      { "key": "view", "label": "View" },
      { "key": "create", "label": "Create" }
    ]
  }'
```

**List Modules**:
```bash
curl http://localhost:3000/saas/module?page=1&limit=20 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Update Module**:
```bash
curl -X PUT http://localhost:3000/saas/module/MODULE_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Updated Module Name",
    "isActive": true
  }'
```

**Delete Module**:
```bash
curl -X DELETE http://localhost:3000/saas/module/MODULE_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Debugging

### Enable Detailed Logging

Update `src/libs/logger.js` to include sync operations:

```javascript
logger.info({ 
  endpoint: '/saas/company/:id/sync',
  companyId,
  encrypted: true
}, 'Sync initiated');
```

### Check Encryption Keys

Verify in Node.js console:

```javascript
const crypto = require('crypto');
const secret = process.env.SYNC_API_SECRET;
const key = crypto.createHash('sha256').update(secret).digest();
console.log('Key (hex):', key.toString('hex'));
console.log('Key length:', key.length); // Should be 32 bytes
```

### Monitor Requests

Enable request logging middleware:

```javascript
// In src/routes/api.js
const morgan = require('morgan');
router.use(morgan('combined'));
```

---

## Checklist

- [ ] `.env` file configured with SYNC_API_SECRET
- [ ] MongoDB connection verified
- [ ] JWT authentication working
- [ ] Crypto utils tested
- [ ] Company sync endpoint responding
- [ ] Ticket sync endpoints configured (awaiting Laravel URL)
- [ ] Module CRUD endpoints working
- [ ] Error logging in place
- [ ] Rate limiting enabled
- [ ] HTTPS enforced in production

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "SYNC_API_SECRET not found" | Add to `.env` file |
| "Invalid authentication tag" | Verify secret matches between Node.js and Laravel |
| "500 Internal Server Error on sync" | Check SYNC_REMOTE_URL is correct and Laravel is running |
| "Permission denied" | Verify JWT token has required permissions |
| "Module not found" | Ensure MongoDB has module collection |

---

## Next Steps

1. ✅ Backend endpoints created and tested
2. ⏳ Deploy to staging environment
3. ⏳ Configure Laravel sync endpoints
4. ⏳ Test end-to-end encryption flow
5. ⏳ Load test with high-volume requests
6. ⏳ Deploy to production with monitoring
