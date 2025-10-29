# TerraCred Smart Contracts

Solidity smart contracts for the TerraCred Protocol built with Foundry for deployment on Hedera EVM.

## 📁 Contract Structure

```
contracts/
├── src/
│   ├── LendingPool.sol       # Core lending logic
│   └── PriceOracle.sol        # Asset price oracle
├── script/
│   └── Deploy.s.sol           # Deployment script
├── foundry.toml               # Foundry configuration
└── README.md
```

## 🔧 Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js >= 18.0.0
- Hedera Testnet account with HBAR balance
- heNGN token deployed (see backend setup)

## 📦 Installation

```bash
# Navigate to contracts directory
cd contracts

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std

# Build contracts
forge build
```

## 🚀 Deployment

### 1. Environment Setup

Create a `.env` file in the contracts directory:

```bash
# Deployer wallet (ECDSA private key)
DEPLOYER_PRIVATE_KEY=0x...

# Hedera RPC URL
HEDERA_RPC_URL=https://testnet.hashio.io/api

# heNGN Token Address (EVM format)
HENGN_ADDRESS=0x...

# Chain ID (Hedera Testnet = 296)
CHAIN_ID=296
```

### 2. Deploy Contracts

```bash
# Deploy to Hedera Testnet
forge script script/Deploy.s.sol \
    --rpc-url $HEDERA_RPC_URL \
    --broadcast \
    --legacy

# The script will output:
# - Oracle deployed at: 0x...
# - LendingPool deployed at: 0x...
```

### 3. Save Deployed Addresses

Copy the deployed contract addresses to your backend `.env`:

```bash
ORACLE_ADDRESS=0x...
LENDING_POOL_ADDRESS=0x...
```

## 📝 Contract Details

### LendingPool.sol

The core lending contract that handles:

**Features:**
- ✅ Collateral deposits (RWA tokens)
- ✅ Borrowing heNGN stablecoin
- ✅ Loan repayment with interest
- ✅ Collateral withdrawal
- ✅ Automated liquidations
- ✅ Interest accrual (5% APR)
- ✅ Health factor monitoring

**Key Parameters:**
- `COLLATERAL_RATIO`: 150% (users can borrow up to 66.67% of collateral value)
- `LIQUIDATION_THRESHOLD`: 120% (positions liquidated below this)
- `LIQUIDATION_BONUS`: 5% (liquidators receive 5% bonus)
- `INTEREST_RATE`: 5% APR
- `ORIGINATION_FEE`: 0.1% on borrowed amount

**Main Functions:**

```solidity
// Deposit RWA token as collateral
function depositCollateral(address token, uint256 amount) external

// Borrow heNGN against collateral
function borrow(uint256 amount) external

// Repay loan (principal + interest)
function repay(uint256 amount) external

// Withdraw unused collateral
function withdrawCollateral(uint256 amount) external

// Liquidate undercollateralized position
function liquidate(address borrower) external

// View loan details
function getLoanDetails(address user) external view returns (...)

// Check health factor
function getHealthFactor(address user) public view returns (uint256)

// Check if position is liquidatable
function isLiquidatable(address user) public view returns (bool)
```

**Admin Functions:**

```solidity
// Add supported collateral token
function addSupportedToken(address token) external onlyOwner

// Remove supported token
function removeSupportedToken(address token) external onlyOwner

// Update oracle address
function updateOracle(address newOracle) external onlyOwner

// Withdraw protocol fees
function withdrawFees() external onlyOwner
```

### PriceOracle.sol

Price oracle for asset valuation:

**Features:**
- ✅ Single price updates
- ✅ Batch price updates
- ✅ Staleness protection (24-hour max age)
- ✅ Price validation

**Main Functions:**

```solidity
// Update single asset price
function updatePrice(address token, uint256 price) external onlyOwner

// Batch update multiple prices
function updatePrices(address[] tokens, uint256[] prices) external onlyOwner

// Get current price (reverts if stale)
function getPrice(address token) external view returns (uint256)

// Check if price is stale
function isPriceStale(address token) external view returns (bool)
```

**Price Format:**
- Prices are in 18 decimals (Wei format)
- Example: 50,000,000 NGN = 50000000 * 10^18

## 🔐 Security Features

1. **ReentrancyGuard**: All external state-changing functions protected
2. **Access Control**: Admin functions restricted to owner
3. **Input Validation**: Comprehensive checks on all inputs
4. **Custom Errors**: Gas-efficient error handling
5. **Staleness Protection**: Oracle prices expire after 24 hours
6. **Health Factor Monitoring**: Automatic liquidation protection

## 🧪 Testing

```bash
# Run tests (when implemented)
forge test

# Run tests with gas reporting
forge test --gas-report

# Run specific test
forge test --match-test testBorrow

# Run with verbosity
forge test -vvv
```

## 🔍 Verification

Verify contracts on HashScan (Hedera's block explorer):

```bash
# Verify PriceOracle
forge verify-contract \
    --chain-id 296 \
    --compiler-version v0.8.24 \
    <ORACLE_ADDRESS> \
    src/PriceOracle.sol:PriceOracle

# Verify LendingPool
forge verify-contract \
    --chain-id 296 \
    --compiler-version v0.8.24 \
    --constructor-args $(cast abi-encode "constructor(address,address)" <HENGN_ADDRESS> <ORACLE_ADDRESS>) \
    <LENDING_POOL_ADDRESS> \
    src/LendingPool.sol:LendingPool
```

## 📊 Usage Examples

### For Users

```solidity
// 1. Deposit collateral (RWA tokens)
IERC20(rwaToken).approve(lendingPool, amount);
ILendingPool(lendingPool).depositCollateral(rwaToken, amount);

// 2. Borrow heNGN
ILendingPool(lendingPool).borrow(borrowAmount);

// 3. Repay loan
IERC20(heNGN).approve(lendingPool, repayAmount);
ILendingPool(lendingPool).repay(repayAmount);

// 4. Withdraw collateral
ILendingPool(lendingPool).withdrawCollateral(amount);
```

### For Liquidators

```solidity
// 1. Check if position is liquidatable
bool canLiquidate = ILendingPool(lendingPool).isLiquidatable(borrower);

// 2. Approve heNGN to cover debt
IERC20(heNGN).approve(lendingPool, debtAmount);

// 3. Execute liquidation
ILendingPool(lendingPool).liquidate(borrower);
// Liquidator receives collateral + 5% bonus
```

### For Oracle Service

```solidity
// Update single price
IPriceOracle(oracle).updatePrice(token, newPrice);

// Update multiple prices
address[] memory tokens = new address[](2);
uint256[] memory prices = new uint256[](2);
tokens[0] = token1;
tokens[1] = token2;
prices[0] = price1;
prices[1] = price2;
IPriceOracle(oracle).updatePrices(tokens, prices);
```

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/Next)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│   (Express)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Hedera EVM                  │
│                                 │
│  ┌──────────────┐              │
│  │ LendingPool  │◄──────┐      │
│  └──────┬───────┘       │      │
│         │               │      │
│         ▼               │      │
│  ┌──────────────┐       │      │
│  │ PriceOracle  │       │      │
│  └──────────────┘       │      │
│                         │      │
│  ┌──────────────┐       │      │
│  │  heNGN Token │       │      │
│  └──────────────┘       │      │
│                         │      │
│  ┌──────────────┐       │      │
│  │  RWA Tokens  │───────┘      │
│  │  (HTS)       │              │
│  └──────────────┘              │
└─────────────────────────────────┘
```

## 🔧 Post-Deployment Setup

After deploying, you need to:

1. **Add Supported Tokens** to LendingPool:
   ```bash
   cast send <LENDING_POOL_ADDRESS> \
       "addSupportedToken(address)" \
       <RWA_TOKEN_ADDRESS> \
       --rpc-url $HEDERA_RPC_URL \
       --private-key $DEPLOYER_PRIVATE_KEY \
       --legacy
   ```

2. **Fund LendingPool** with heNGN:
   ```bash
   cast send <HENGN_ADDRESS> \
       "transfer(address,uint256)" \
       <LENDING_POOL_ADDRESS> \
       <AMOUNT> \
       --rpc-url $HEDERA_RPC_URL \
       --private-key $DEPLOYER_PRIVATE_KEY \
       --legacy
   ```

3. **Set Initial Prices** in Oracle:
   ```bash
   cast send <ORACLE_ADDRESS> \
       "updatePrice(address,uint256)" \
       <RWA_TOKEN_ADDRESS> \
       <PRICE_IN_WEI> \
       --rpc-url $HEDERA_RPC_URL \
       --private-key $ORACLE_PRIVATE_KEY \
       --legacy
   ```

4. **Transfer Oracle Ownership** to oracle service account (optional):
   ```bash
   cast send <ORACLE_ADDRESS> \
       "transferOwnership(address)" \
       <ORACLE_SERVICE_ADDRESS> \
       --rpc-url $HEDERA_RPC_URL \
       --private-key $DEPLOYER_PRIVATE_KEY \
       --legacy
   ```

## 🐛 Troubleshooting

### Common Issues

**1. Deployment fails with "insufficient funds"**
- Ensure deployer account has enough HBAR (minimum 10 HBAR recommended)

**2. Transaction reverts with "INVALID_SIGNATURE"**
- Use `--legacy` flag for Hedera compatibility
- Verify private key format (should start with 0x)

**3. "Price not set" error**
- Initialize oracle prices before using LendingPool
- Check that oracle address in LendingPool is correct

**4. "Token not supported" error**
- Add RWA token to supported tokens list using `addSupportedToken()`

**5. Liquidation fails**
- Ensure liquidator has approved enough heNGN
- Check that position is actually liquidatable

## 📚 Additional Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hedera JSON-RPC](https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay)

## 🔐 Security Considerations

**For Production:**
1. Complete security audit by professional firm
2. Implement comprehensive test suite (unit, integration, fuzz)
3. Add pause functionality for emergency stops
4. Implement upgradability pattern (if needed)
5. Add multi-sig for admin functions
6. Monitor oracle for price manipulation
7. Implement rate limiting on liquidations
8. Add circuit breakers for extreme market conditions

## 📄 License

MIT License - See LICENSE file for details

---

Built for Hedera Africa Hackathon 2025 🚀
