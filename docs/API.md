# TerraCred API Reference

Complete API documentation for the TerraCred Protocol backend.

Base URL: `http://localhost:3001/api`

## Table of Contents

- [Properties](#properties)
- [Users](#users)
- [Assets](#assets)
- [Loans](#loans)
- [Transactions](#transactions)
- [Health Check](#health-check)

---

## Properties

Manage real estate property submissions, verification, and tokenization.

### Submit Property

Submit a new property for verification and tokenization.

**Endpoint:** `POST /api/properties`

**Request Body:**
```json
{
  "owner": "0.0.12345",
  "address": "123 Victoria Island, Lagos, Nigeria",
  "value": 50000000,
  "description": "Luxury 4-bedroom apartment with ocean view",
  "proofDocumentUri": "ipfs://Qm...abc123",
  "tokenSupply": 1000
}
```

**Response:**
```json
{
  "success": true,
  "property": {
    "propertyId": "PROP004",
    "status": "pending",
    "message": "Property submitted for verification"
  }
}
```

### Get Property Status

Check the verification status of a property.

**Endpoint:** `GET /api/properties/:propertyId/status`

**Parameters:**
- `propertyId` - Property identifier (e.g., PROP001)

**Response:**
```json
{
  "success": true,
  "status": {
    "propertyId": "PROP001",
    "status": "verified",
    "verifiedAt": "2025-10-15T10:00:00.000Z",
    "tokenId": "0.0.11111",
    "tokenAddress": "0x1234567890123456789012345678901234567890",
    "message": "Property verified and tokenized"
  }
}
```

**Status Values:**
- `pending` - Verification in progress
- `verified` - Verified and tokenized
- `rejected` - Verification rejected

### Get Property Details

Retrieve complete property information.

**Endpoint:** `GET /api/properties/:propertyId`

**Response:**
```json
{
  "success": true,
  "property": {
    "propertyId": "PROP001",
    "owner": "0.0.12345",
    "address": "123 Victoria Island, Lagos, Nigeria",
    "value": 50000000,
    "description": "Luxury 4-bedroom apartment",
    "status": "verified",
    "tokenId": "0.0.11111",
    "tokenAddress": "0x1234...",
    "tokenSupply": 1000,
    "proofDocumentUri": "ipfs://Qm...abc123",
    "verifiedAt": "2025-10-15T10:00:00.000Z",
    "createdAt": "2025-10-10T08:00:00.000Z"
  }
}
```

### List Properties

Get all properties, optionally filtered by owner.

**Endpoint:** `GET /api/properties?owner=0.0.12345`

**Query Parameters:**
- `owner` (optional) - Filter by owner Hedera account ID

**Response:**
```json
{
  "success": true,
  "properties": [
    {
      "propertyId": "PROP001",
      "owner": "0.0.12345",
      "address": "123 Victoria Island, Lagos",
      "value": 50000000,
      "status": "verified",
      "tokenId": "0.0.11111"
    }
  ]
}
```

### Verify Property (Admin)

Approve a property and tokenize it.

**Endpoint:** `POST /api/properties/:propertyId/verify`

**Request Body:**
```json
{
  "verifier": "0.0.98765",
  "tokenId": "0.0.11111",
  "tokenAddress": "0x1234..."
}
```

**Response:**
```json
{
  "success": true,
  "property": {
    "propertyId": "PROP001",
    "status": "verified",
    "verifiedAt": "2025-10-15T10:00:00.000Z",
    "tokenId": "0.0.11111"
  }
}
```

---

## Users

Manage user profiles and KYC verification.

### Get User Profile

Retrieve user information by account ID.

**Endpoint:** `GET /api/users/:accountId`

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "USER001",
    "accountId": "0.0.12345",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "kycStatus": "verified",
    "kycLevel": "full",
    "createdAt": "2025-10-01T08:00:00.000Z"
  }
}
```

### Submit KYC

Submit KYC information for verification.

**Endpoint:** `POST /api/users/kyc`

**Request Body:**
```json
{
  "accountId": "0.0.12345",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "kycProvider": "Persona",
  "documentType": "passport",
  "documentNumber": "A12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "KYC submitted for verification",
  "kyc": {
    "userId": "USER001",
    "accountId": "0.0.12345",
    "status": "pending",
    "submittedAt": "2025-10-22T12:00:00.000Z"
  }
}
```

### Get KYC Status

Check KYC verification status.

**Endpoint:** `GET /api/users/:accountId/kyc`

**Response:**
```json
{
  "success": true,
  "kyc": {
    "userId": "USER001",
    "accountId": "0.0.12345",
    "status": "verified",
    "level": "full",
    "provider": "Persona",
    "verifiedAt": "2025-10-05T10:00:00.000Z"
  }
}
```

**KYC Status Values:**
- `not_started` - No submission yet
- `pending` - Under review
- `verified` - Approved
- `rejected` - Declined

### Get User Assets

Retrieve tokenized properties owned by user.

**Endpoint:** `GET /api/users/:accountId/assets`

**Response:**
```json
{
  "success": true,
  "assets": [
    {
      "tokenId": "0.0.11111",
      "propertyId": "PROP001",
      "address": "123 Victoria Island, Lagos",
      "value": 50000000,
      "tokenSupply": 1000
    }
  ]
}
```

### Get User Transactions

Retrieve user's transaction history.

**Endpoint:** `GET /api/users/:accountId/transactions`

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "txId": "TX000001",
      "type": "PROPERTY_VERIFIED",
      "timestamp": "2025-10-15T10:00:00.000Z",
      "data": {}
    }
  ]
}
```

---

## Assets

Query tokenized property assets.

### List User Assets

Get all assets owned by a specific address.

**Endpoint:** `GET /api/assets?owner=0.0.12345`

**Query Parameters:**
- `owner` (required) - Owner Hedera account ID

**Response:**
```json
{
  "success": true,
  "count": 2,
  "assets": [
    {
      "tokenId": "0.0.11111",
      "tokenAddress": "0x1234...",
      "propertyId": "PROP001",
      "owner": "0.0.12345",
      "address": "123 Victoria Island, Lagos",
      "value": 50000000,
      "tokenSupply": 1000,
      "status": "verified",
      "verifiedAt": "2025-10-15T10:00:00.000Z"
    }
  ]
}
```

### Get Asset Details

Retrieve detailed information about a specific tokenized asset.

**Endpoint:** `GET /api/assets/:tokenId`

**Parameters:**
- `tokenId` - Token identifier (e.g., 0.0.11111)

**Response:**
```json
{
  "success": true,
  "asset": {
    "tokenId": "0.0.11111",
    "tokenAddress": "0x1234...",
    "propertyId": "PROP001",
    "owner": "0.0.12345",
    "address": "123 Victoria Island, Lagos",
    "value": 50000000,
    "description": "Luxury apartment",
    "tokenSupply": 1000,
    "proofDocumentUri": "ipfs://Qm...abc123",
    "appraisalHash": "0xabc...123",
    "deedHash": "0xdef...456",
    "verifier": "0.0.98765"
  }
}
```

### Get Asset Valuation

Retrieve current market valuation for an asset.

**Endpoint:** `GET /api/assets/:tokenId/valuation`

**Response:**
```json
{
  "success": true,
  "valuation": {
    "tokenId": "0.0.11111",
    "propertyId": "PROP001",
    "baseValue": 50000000,
    "currentValue": 51250000,
    "priceChange": 1250000,
    "priceChangePercent": "2.50",
    "lastUpdated": "2025-10-22T12:00:00.000Z",
    "currency": "NGN"
  }
}
```

### Get Collateral Status

Check if an asset is currently used as collateral.

**Endpoint:** `GET /api/assets/:tokenId/collateral`

**Response (Collateralized):**
```json
{
  "success": true,
  "collateral": {
    "tokenId": "0.0.11111",
    "isCollateralized": true,
    "collateralAmount": 500,
    "borrowedAmount": 20000000,
    "availableToBorrow": 13000000,
    "healthFactor": 165
  }
}
```

**Response (Not Collateralized):**
```json
{
  "success": true,
  "collateral": {
    "tokenId": "0.0.11111",
    "isCollateralized": false,
    "availableForCollateral": 1000
  }
}
```

---

## Loans

Manage lending positions and retrieve loan details.

### Get Loan Details

Retrieve on-chain loan information for a user.

**Endpoint:** `GET /api/loans/:userAddress`

**Parameters:**
- `userAddress` - User's Hedera account ID or EVM address

**Response:**
```json
{
  "success": true,
  "loan": {
    "collateralAmount": "500",
    "collateralToken": "0x1234...",
    "borrowedAmount": "20000000",
    "totalDebt": "21000000",
    "healthFactor": "150",
    "maxBorrow": "5000000"
  }
}
```

**Field Descriptions:**
- `collateralAmount` - Number of collateral tokens deposited
- `collateralToken` - Address of collateral token contract
- `borrowedAmount` - Principal amount borrowed
- `totalDebt` - Principal + accrued interest
- `healthFactor` - Collateral ratio (150 = 150%)
- `maxBorrow` - Additional borrowing capacity

### Get Loan History

Retrieve historical loan events from HCS.

**Endpoint:** `GET /api/loans/:userAddress/history`

**Response:**
```json
{
  "success": true,
  "history": []
}
```

*Note: HCS message querying will be implemented in a future update.*

---

## Transactions

Access the complete audit trail of protocol events.

### List Transactions

Get transactions with optional filtering.

**Endpoint:** `GET /api/transactions?owner=0.0.12345&type=LOAN_CREATED&limit=10`

**Query Parameters:**
- `owner` (optional) - Filter by user address
- `type` (optional) - Filter by transaction type
- `limit` (optional) - Maximum number of results (default: all)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "transactions": [
    {
      "txId": "TX000002",
      "type": "LOAN_CREATED",
      "propertyId": "PROP001",
      "userAddress": "0.0.12345",
      "data": {
        "collateralToken": "0x1234...",
        "collateralAmount": "500",
        "borrowAmount": "20000000"
      },
      "timestamp": "2025-10-16T14:30:00.000Z"
    }
  ]
}
```

### Get Transaction Types

Retrieve list of available transaction types for filtering.

**Endpoint:** `GET /api/transactions/meta/types`

**Response:**
```json
{
  "success": true,
  "types": [
    "PROPERTY_SUBMITTED",
    "PROPERTY_VERIFIED",
    "PROPERTY_REJECTED",
    "KYC_SUBMITTED",
    "KYC_VERIFIED",
    "KYC_REJECTED",
    "LOAN_CREATED",
    "LOAN_REPAID",
    "LIQUIDATION",
    "PRICE_UPDATE"
  ]
}
```

### Get Transaction Statistics

Retrieve aggregated transaction statistics.

**Endpoint:** `GET /api/transactions/meta/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 15,
    "byType": {
      "PROPERTY_VERIFIED": 3,
      "LOAN_CREATED": 2,
      "KYC_VERIFIED": 2
    },
    "recent": []
  }
}
```

---

## Health Check

Check backend service status.

### Health Status

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T12:00:00.000Z",
  "network": "testnet"
}
```

---

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting is implemented for the MVP. For production deployment, implement rate limiting per IP/API key.

## Authentication

Currently no authentication is required for the MVP. For production deployment, implement JWT-based authentication.

## CORS

CORS is enabled for all origins in the current configuration. For production, restrict to your frontend domain.

---

## Example Usage

### Complete Property Submission Flow

```bash
# 1. Submit property
curl -X POST http://localhost:3001/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "0.0.12345",
    "address": "123 Test Street, Lagos",
    "value": 50000000,
    "tokenSupply": 1000
  }'

# Response: { "success": true, "property": { "propertyId": "PROP004" } }

# 2. Check status
curl http://localhost:3001/api/properties/PROP004/status

# 3. Admin verifies (for demo)
curl -X POST http://localhost:3001/api/properties/PROP004/verify \
  -H "Content-Type: application/json" \
  -d '{}'

# 4. Get tokenized asset
curl http://localhost:3001/api/assets/0.0.11114
```

### Complete KYC Flow

```bash
# 1. Submit KYC
curl -X POST http://localhost:3001/api/users/kyc \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "0.0.12345",
    "email": "user@example.com",
    "name": "John Doe"
  }'

# 2. Check status
curl http://localhost:3001/api/users/0.0.12345/kyc

# 3. Admin approves (for demo)
curl -X POST http://localhost:3001/api/users/0.0.12345/kyc/approve \
  -H "Content-Type: application/json" \
  -d '{ "level": "full" }'
```

---

Built for Hedera Africa Hackathon 2025 🚀
