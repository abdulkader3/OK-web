# Sales Management - Backend Integration Guide

This document describes how to run the Sales Management module against the local backend and test the main integration flows.

## Prerequisites

1. **Backend Server**: Running at `http://localhost:4000`
2. **Expo CLI**: Installed globally (`npm install -g expo-cli`)
3. **Node.js**: Version 18+

## Getting a Dev Token

### Option 1: Using curl (from docs/curl-examples.sh)

```bash
# Login to get auth tokens
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

This returns access and refresh tokens in cookies. For testing, you can also:

### Option 2: Use the Mobile App

1. Run the app: `npx expo start`
2. Login with your credentials
3. The app stores the token automatically in secure storage

### Option 3: Seed Test Data

Use the sample data from `docs/sample-data.json`:

```bash
# This requires an authenticated request - use Postman or the app
curl -X POST http://localhost:4000/api/dev/seed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d @docs/sample-data.json
```

## Running the App

```bash
# Install dependencies
npm install

# Start Expo
npx expo start

# Or for Android
npx expo run:android
```

### Configure API URL

The app expects the API URL in `app.json` under `extra.API_URL`. Default is `http://localhost:4000`.

For physical device testing on the same network, use your machine's local IP:
```json
"extra": {
  "API_URL": "http://192.168.1.x:4000"
}
```

## Testing the Sync Flow

### 1. Create Product with Image Offline

**Test Steps:**
1. Go to Sales Management → Add Product
2. Enter product name and price
3. Add a product image (camera or gallery)
4. Save the product

**Expected Behavior:**
- Product is saved locally immediately with `syncStatus: pending`
- Image is queued for upload
- Product appears in the list with pending indicator

**Verification:**
```bash
# Check local storage (via React Native Debugger)
# Products are stored at @sales_products key in AsyncStorage

# After sync (when online), check server
curl -X GET http://localhost:4000/api/products \
  -H "Authorization: Bearer <token>"
```

### 2. Upload + Sync Product

**Test Steps:**
1. Ensure device is online
2. The sync should happen automatically, or tap the sync indicator on the Sales Dashboard

**Expected Behavior:**
- Images are uploaded via `POST /api/uploads/receipt`
- Products are synced via `POST /api/sync/batch`
- Server assigns permanent IDs
- Local ID mapping is stored for reconciliation

**Verification:**
```bash
# Check sync queue is empty
curl -X GET http://localhost:4000/api/sync/status \
  -H "Authorization: Bearer <token>"
```

### 3. Create Sale with Ledger (Credit Sale)

**Test Steps:**
1. Go to Sales Management → Add Daily Sale
2. Add products to the cart
3. Tap the customer button to select a ledger
4. Select an existing customer or skip for cash sale
5. Save the sale

**Expected Behavior:**
- Sale is saved locally with `syncStatus: pending`
- If ledger selected, includes `ledgerId` and `ledgerName`

**Verification:**
```bash
# Check local sales
curl -X GET http://localhost:4000/api/sales \
  -H "Authorization: Bearer <token>"
```

### 4. Sync Sale and Receive Server ledgerTxnId

**Test Steps:**
1. Ensure device is online
2. Trigger sync

**Expected Behavior:**
- Sale synced via batch operation
- If ledger selected, creates debt transaction
- Server returns `ledgerDebtId` if debt was created

**Verification:**
```bash
# Check sale with ledger
curl -X GET http://localhost:4000/api/sales/<sale-id> \
  -H "Authorization: Bearer <token>"

# Check ledger balance
curl -X GET http://localhost:4000/api/ledgers/<ledger-id> \
  -H "Authorization: Bearer <token>"
```

## API Endpoints Used

| Endpoint | Method | Purpose |
|-----------|--------|---------|
| `/api/products` | POST | Create product |
| `/api/products` | GET | List products |
| `/api/sales` | POST | Create sale |
| `/api/sales` | GET | List sales |
| `/api/uploads/receipt` | POST | Upload image (multipart) |
| `/api/sync/batch` | POST | Batch sync operations |
| `/api/sync/status` | GET | Get changes since timestamp |

## Sync Features Implemented

1. **Offline-First**: All data is saved locally first
2. **Queue Management**: Pending operations stored in AsyncStorage
3. **Image Upload**: Images queued separately, uploaded before sync
4. **Batch Sync**: Max 100 operations per batch (per API spec)
5. **ID Mapping**: Local temp IDs mapped to server IDs
6. **Retry Logic**: Failed items can be retried (max 3 attempts)
7. **Status Indicators**: Global sync indicator + per-item badges
8. **Conflict Resolution**: Server is source of truth for balances

## Troubleshooting

### Sync Not Happening
- Check device is online
- Verify auth token is valid
- Check console for errors

### Image Upload Failing
- Ensure image size < 5MB (API limit)
- Check network connection

### ID Mapping Issues
- Clear sync queue: `await clearQueue()` (via dev tools)
- Re-sync from scratch

### Ledger Not Found
- Ensure ledger exists on server first
- For new credit sales, create ledger in the main app

## Test Log Example

```
[TEST] Create Product Offline
- Product saved locally: { _id: "temp-123", syncStatus: "pending" }
- Image queued for upload: { id: "upload-1", status: "pending" }

[TEST] Sync Product
- Image uploaded: POST /api/uploads/receipt → { url: "https://..." }
- Batch sync: POST /api/sync/batch
- Server response: { serverAssignedId: "server-456" }
- ID mapping stored: { "temp-123": "server-456" }

[TEST] Create Sale with Ledger
- Sale saved locally: { _id: "temp-sale-1", ledgerId: "ledger-789", syncStatus: "pending" }

[TEST] Sync Sale
- Batch sync includes sale operation
- Server response: { 
    serverAssignedId: "server-sale-1", 
    ledgerDebtId: "server-debt-1" 
  }
- Ledger balance updated: 1000 → 1170 (if sale was $170)
```