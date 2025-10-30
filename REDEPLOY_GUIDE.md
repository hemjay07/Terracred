# LendingPool Redeployment Guide

## What Changed

The LendingPool contract has been updated to **automatically whitelist the master RWA token** during deployment. This eliminates the need for manual admin actions after deployment.

### Contract Changes
- **LendingPool.sol**: Constructor now accepts `_masterRWAToken` parameter and automatically adds it to `supportedTokens`
- **Deploy.s.sol**: Deployment script updated to pass the master RWA token address

## Prerequisites

- Foundry installed
- Access to the deployer account (0.0.7095129)
- Sufficient HBAR in deployer account (~20 HBAR recommended)

## Deployment Steps

### 1. Navigate to contracts directory
```bash
cd /Users/mujeeb/Documents/ezyZip/contracts
```

### 2. Deploy the contracts
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url $HEDERA_RPC_URL --broadcast
```

### 3. Save the new contract addresses
The deployment will output:
```
Oracle deployed at: 0x...
LendingPool deployed at: 0x...
Using heNGN at: 0x00000000000000000000000000000000006c832c
Master RWA token auto-whitelisted: 0x00000000000000000000000000000000006ca212
```

**IMPORTANT**: Save these addresses! You'll need them for the next steps.

### 4. Convert EVM addresses to Hedera IDs

Use the Hedera Mirror Node API or HashScan to convert the EVM addresses to Hedera IDs:

**Oracle Address** → Oracle ID (0.0.xxxxx)
**LendingPool Address** → LendingPool ID (0.0.xxxxx)

Or use this quick conversion (for long-form addresses):
```javascript
// Remove 0x prefix, convert hex to decimal
const evmAddress = "0x00000000000000000000000000000000xxxxxxxx";
const hex = evmAddress.slice(2);
const decimal = parseInt(hex, 16);
const hederaId = `0.0.${decimal}`;
```

### 5. Update Configuration Files

You need to update **3 files** with the new contract addresses:

#### A. Frontend Constants
**File**: `/Users/mujeeb/Documents/ezyZip/frontend/constants/index.ts`

Update lines 11-14:
```typescript
LENDING_POOL_ADDRESS: '0xNEW_EVM_ADDRESS_HERE',
LENDING_POOL_ID: '0.0.NEW_ID_HERE',
ORACLE_ADDRESS: '0xNEW_ORACLE_EVM_ADDRESS_HERE',
ORACLE_ID: '0.0.NEW_ORACLE_ID_HERE',
```

#### B. Contracts .env
**File**: `/Users/mujeeb/Documents/ezyZip/contracts/.env`

Update lines 24-25:
```bash
ORACLE_ADDRESS=0xNEW_ORACLE_ADDRESS_HERE
LENDING_POOL_ADDRESS=0xNEW_LENDING_POOL_ADDRESS_HERE
```

#### C. Backend .env (if exists)
Check if backend has contract addresses and update them too.

### 6. Fund the LendingPool with heNGN

The lending pool needs heNGN to lend out. If you have a funding script:
```bash
cd /Users/mujeeb/Documents/ezyZip/contracts
forge script script/FundLendingPool.s.sol:FundLendingPoolScript --rpc-url $HEDERA_RPC_URL --broadcast
```

Or manually transfer heNGN to the new LendingPool contract address.

### 7. Restart Your Applications

```bash
# Frontend
cd /Users/mujeeb/Documents/ezyZip/frontend
npm run dev

# Backend
cd /Users/mujeeb/Documents/ezyZip/backend
npm run dev
```

## Verification Checklist

After redeployment, verify everything works:

- [ ] Frontend connects to wallet successfully
- [ ] Property tokenization works
- [ ] Token association works
- [ ] **Deposit collateral works (no more CONTRACT_REVERT error!)**
- [ ] Borrow function works
- [ ] Repay function works

## What About Existing Data?

**Important**: This is a NEW contract deployment. Any existing data in the old contract will NOT be transferred:
- Existing loans will remain in the old contract
- Property tokens created with the old contract are still valid
- Users will need to interact with the new contract for new loans

If you have active test data you want to preserve, you'll need to:
1. Repay all loans in the old contract
2. Withdraw all collateral
3. Then start fresh with the new contract

## Troubleshooting

### "Insufficient HBAR" during deployment
- Make sure deployer account (0.0.7095129) has at least 10-20 HBAR

### "Invalid token address" error
- Verify MASTER_RWA_TOKEN_ADDRESS is set correctly in contracts/.env
- Should be: `0x00000000000000000000000000000000006ca212`

### Frontend still shows old contract
- Clear browser cache
- Check that constants/index.ts was updated correctly
- Restart the frontend dev server

### Deposit still fails
- Verify the master RWA token was auto-whitelisted (check deployment logs)
- Make sure you updated ALL 3 configuration files
- Ensure you're using the correct token address in your deposit call

## Benefits of This Approach

✅ **No manual admin actions needed** - Token is whitelisted automatically
✅ **Safer** - Eliminates possibility of forgetting to whitelist
✅ **Cleaner code** - One-time setup in constructor
✅ **Production-ready** - Works correctly from the moment of deployment

## Need Help?

- Check HashScan for your deployed contracts: https://hashscan.io/testnet
- View deployment history: `/Users/mujeeb/Documents/ezyZip/contracts/broadcast/`
- Contract source: `/Users/mujeeb/Documents/ezyZip/contracts/src/LendingPool.sol`
