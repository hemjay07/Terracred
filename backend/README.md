# TerraCred Backend

Backend API server for the TerraCred Protocol - A DeFi lending platform built on Hedera that enables borrowing against tokenized real estate assets.

## Features

- 🏠 **Property Tokenization**: Convert real estate into fungible RWA tokens via Hedera Token Service
- 💰 **Lending Operations**: Deposit collateral, borrow heNGN stablecoin, manage loans
- 📊 **Price Oracle**: Real-time asset valuation with staleness protection
- 🔒 **Automated Liquidation**: Continuous health factor monitoring and automated liquidations
- 📝 **Immutable Audit Trail**: All events logged via Hedera Consensus Service (HCS)
- 👤 **KYC Management**: User verification and compliance tracking

## Architecture

### Core Services

1. **Hedera Service** - Token operations (create, mint, burn, associate, KYC)
2. **HCS Service** - Consensus logging for audit trail
3. **Oracle Service** - Price updates and valuation
4. **Liquidation Service** - Automated position monitoring

### API Routes

- `/api/properties` - Property submission, verification, tokenization
- `/api/users` - User profiles and KYC management
- `/api/assets` - Tokenized asset queries and valuation
- `/api/loans` - Loan details and history
- `/api/transactions` - Complete audit trail

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Hedera Testnet account ([Get one here](https://portal.hedera.com))
- Deployed smart contracts (LendingPool, PriceOracle)

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.sample .env

# Edit .env with your credentials
nano .env
```

## Configuration

### 1. Get Hedera Credentials

1. Visit [Hedera Portal](https://portal.hedera.com)
2. Create a testnet account
3. Copy your Account ID and Private Key
4. Add to `.env` file

### 2. Deploy Smart Contracts

```bash
cd ../contracts
forge build
forge script script/Deploy.s.sol --rpc-url $HEDERA_RPC_URL --broadcast
```

Copy the deployed contract addresses to your `.env` file:
- `LENDING_POOL_ADDRESS`
- `ORACLE_ADDRESS`

### 3. Setup Tokens

```bash
npm run setup-tokens
```

This will:
- Create the heNGN stablecoin
- Create a test RWA token
- Associate tokens with your account
- Grant KYC permissions

**Important**: Save the generated token IDs to your `.env` file.

### 4. Configure Service Keys

Generate separate private keys for oracle and liquidation services:

```bash
# Generate new keys (optional - can use main key for demo)
# Add to .env as ORACLE_PRIVATE_KEY and LIQUIDATION_PRIVATE_KEY
```

## Running the Backend

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:3001` with auto-reload enabled.

### Production Mode

```bash
npm start
```

## API Documentation

### Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-10-22T12:00:00.000Z",
  "network": "testnet"
}
```

### Submit Property

```bash
POST /api/properties

Body:
{
  "owner": "0.0.12345",
  "address": "123 Victoria Island, Lagos",
  "value": 50000000,
  "description": "4-bedroom apartment",
  "tokenSupply": 1000
}

Response:
{
  "success": true,
  "property": {
    "propertyId": "PROP004",
    "status": "pending",
    "message": "Property submitted for verification"
  }
}
```

### Check Property Status

```bash
GET /api/properties/PROP001/status

Response:
{
  "success": true,
  "status": {
    "propertyId": "PROP001",
    "status": "verified",
    "verifiedAt": "2025-10-15T10:00:00.000Z",
    "tokenId": "0.0.11111",
    "tokenAddress": "0x1234...",
    "message": "Property verified and tokenized"
  }
}
```

### Get User's Assets

```bash
GET /api/assets?owner=0.0.12345

Response:
{
  "success": true,
  "count": 2,
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

### Get Loan Details

```bash
GET /api/loans/0.0.12345

Response:
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

### Submit KYC

```bash
POST /api/users/kyc

Body:
{
  "accountId": "0.0.12345",
  "email": "user@example.com",
  "name": "John Doe",
  "kycProvider": "Persona"
}

Response:
{
  "success": true,
  "message": "KYC submitted for verification",
  "kyc": {
    "userId": "USER001",
    "accountId": "0.0.12345",
    "status": "pending"
  }
}
```

### Get Transaction History

```bash
GET /api/transactions?owner=0.0.12345&limit=10

Response:
{
  "success": true,
  "count": 5,
  "transactions": [
    {
      "txId": "TX000001",
      "type": "PROPERTY_VERIFIED",
      "propertyId": "PROP001",
      "userAddress": "0.0.12345",
      "timestamp": "2025-10-15T10:00:00.000Z"
    }
  ]
}
```

## Service Operations

### Oracle Price Updates

The oracle service automatically updates property prices every 60 minutes (configurable in `app.js`).

### Liquidation Monitoring

The liquidation service monitors loan health factors every 5 minutes and executes liquidations automatically when positions become undercollateralized.

## Demo Data

The backend includes pre-populated dummy data for demo purposes:

- **3 Properties** (2 verified, 1 pending)
- **2 Users** (1 KYC verified, 1 pending)
- **Sample Transactions** (property verifications, loans)

Access demo data through the API endpoints or check `src/data/store.js`.

## Admin Endpoints (For Demo)

These endpoints simulate admin actions for the MVP:

```bash
# Verify a property
POST /api/properties/:propertyId/verify

# Approve KYC
POST /api/users/:accountId/kyc/approve
```

## Development

### Project Structure

```
backend/
├── src/
│   ├── app.js                 # Main application file
│   ├── data/
│   │   └── store.js          # In-memory data store (MVP)
│   ├── routes/
│   │   ├── assets.routes.js
│   │   ├── loan.routes.js
│   │   ├── property.routes.js
│   │   ├── transactions.routes.js
│   │   └── user.routes.js
│   └── services/
│       ├── hedera.service.js
│       ├── hcs.service.js
│       ├── liquidation.service.js
│       └── oracle.service.js
├── scripts/
│   └── setup-tokens.js       # Token creation script
├── .env.sample               # Environment template
└── package.json
```

### Adding New Features

1. Create route file in `src/routes/`
2. Add service logic in `src/services/` if needed
3. Register route in `src/app.js`
4. Update data store in `src/data/store.js`

## Troubleshooting

### Service Won't Start

- Check that all environment variables are set correctly
- Verify Hedera account has sufficient HBAR balance
- Ensure contract addresses are deployed and correct

### Token Operations Failing

- Verify token IDs are set in .env
- Check token associations and KYC status
- Ensure operator has the required keys (supply, admin, etc.)

### Oracle/Liquidation Not Working

- Verify private keys have sufficient HBAR
- Check contract addresses are correct
- Review console logs for specific errors

## Production Considerations

For production deployment:

1. **Replace In-Memory Store**: Implement PostgreSQL database
2. **Add Authentication**: Implement JWT-based auth
3. **Rate Limiting**: Add API rate limiting
4. **Error Handling**: Implement comprehensive error handling
5. **Logging**: Use structured logging (Winston, Pino)
6. **Monitoring**: Add health checks and alerting
7. **Security**: Implement input validation and sanitization
8. **Scalability**: Use connection pooling and caching

## Contributing

This is a hackathon MVP. For production use, please conduct a thorough security audit and implement proper testing.

## License

MIT

## Support

For questions or issues, please contact the TerraCred team.

---

Built for Hedera Africa Hackathon 2025 🚀
