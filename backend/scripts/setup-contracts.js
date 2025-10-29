#!/usr/bin/env node

/**
 * Setup Script for TerraCred Backend
 * Automates token creation and initial configuration
 */

require('dotenv').config();
const { ethers } = require('ethers');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

async function setupContracts() {
  logSection('🚀 TerraCred Contract Setup');

  // Check environment variables
  const requiredEnvVars = [
    'HEDERA_RPC_URL',
    'HEDERA_ACCOUNT_ID',
    'HEDERA_PRIVATE_KEY',
    'DEPLOYER_PRIVATE_KEY',
    'ORACLE_PRIVATE_KEY'
  ];

  log('1️⃣  Checking environment variables...', 'blue');
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    log(`❌ Missing environment variables: ${missing.join(', ')}`, 'red');
    log('Please update your .env file', 'red');
    process.exit(1);
  }
  log('✅ All required environment variables found\n', 'green');

  // Connect to network
  const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL, {
    name: "hedera-testnet",
    chainId: 296
  });

  const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const oracleWallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  log('2️⃣  Checking wallet balances...', 'blue');
  const deployerBalance = await provider.getBalance(deployerWallet.address);
  const oracleBalance = await provider.getBalance(oracleWallet.address);

  console.log(`   Deployer (${deployerWallet.address}): ${ethers.formatEther(deployerBalance)} HBAR`);
  console.log(`   Oracle   (${oracleWallet.address}): ${ethers.formatEther(oracleBalance)} HBAR`);

  if (deployerBalance < ethers.parseEther('10')) {
    log('\n⚠️  WARNING: Deployer balance is low. You may need more HBAR for gas fees.', 'yellow');
  }
  log('');

  // Check if contracts are deployed
  log('3️⃣  Checking deployed contracts...', 'blue');
  
  const lendingPoolAddress = process.env.LENDING_POOL_ADDRESS;
  const oracleAddress = process.env.ORACLE_ADDRESS;
  const heNGNAddress = process.env.HENGN_ADDRESS;

  if (!lendingPoolAddress || !oracleAddress) {
    log('❌ Contract addresses not found in .env', 'red');
    log('Please deploy contracts first using:', 'yellow');
    log('   cd contracts && forge script script/Deploy.s.sol --rpc-url $HEDERA_RPC_URL --broadcast --legacy\n', 'blue');
    process.exit(1);
  }

  console.log(`   LendingPool: ${lendingPoolAddress}`);
  console.log(`   Oracle:      ${oracleAddress}`);
  console.log(`   heNGN:       ${heNGNAddress || 'Not set'}`);
  log('');

  // Initialize contracts
  const lendingPool = new ethers.Contract(
    lendingPoolAddress,
    [
      "function supportedTokens(address) view returns (bool)",
      "function addSupportedToken(address) external",
      "function oracle() view returns (address)",
      "function heNGN() view returns (address)"
    ],
    deployerWallet
  );

  const oracle = new ethers.Contract(
    oracleAddress,
    [
      "function prices(address) view returns (uint256)",
      "function lastUpdate(address) view returns (uint256)",
      "function updatePrice(address, uint256) external"
    ],
    oracleWallet
  );

  log('4️⃣  Verifying contract configuration...', 'blue');
  const actualOracle = await lendingPool.oracle();
  const actualHeNGN = await lendingPool.heNGN();

  console.log(`   LendingPool.oracle:  ${actualOracle}`);
  console.log(`   LendingPool.heNGN:   ${actualHeNGN}`);

  if (actualOracle.toLowerCase() !== oracleAddress.toLowerCase()) {
    log('❌ Oracle address mismatch!', 'red');
    process.exit(1);
  }
  log('   ✅ Contract configuration verified\n', 'green');

  // Check RWA token
  log('5️⃣  Checking RWA token configuration...', 'blue');
  const rwaTokenAddress = process.env.RWA_TOKEN_ADDRESS;
  
  if (!rwaTokenAddress) {
    log('⚠️  RWA_TOKEN_ADDRESS not found in .env', 'yellow');
    log('You need to create RWA tokens using:', 'yellow');
    log('   node scripts/setup-tokens.js\n', 'blue');
  } else {
    console.log(`   RWA Token: ${rwaTokenAddress}`);
    
    const isSupported = await lendingPool.supportedTokens(rwaTokenAddress);
    console.log(`   Supported in LendingPool: ${isSupported}`);

    if (!isSupported) {
      log('   Adding RWA token to supported list...', 'yellow');
      const tx = await lendingPool.addSupportedToken(rwaTokenAddress);
      await tx.wait();
      log('   ✅ RWA token added\n', 'green');
    } else {
      log('   ✅ RWA token already supported\n', 'green');
    }

    // Check price
    try {
      const price = await oracle.prices(rwaTokenAddress);
      if (price > 0) {
        console.log(`   Current Price: ${ethers.formatUnits(price, 18)} NGN`);
        const lastUpdate = await oracle.lastUpdate(rwaTokenAddress);
        console.log(`   Last Updated: ${new Date(Number(lastUpdate) * 1000).toISOString()}`);
        log('   ✅ Price is set\n', 'green');
      } else {
        log('   ⚠️  Price not set yet. Run: node testOracle.js\n', 'yellow');
      }
    } catch (error) {
      log('   ⚠️  Could not read price. Run: node testOracle.js\n', 'yellow');
    }
  }

  // Summary
  logSection('📋 Setup Summary');
  log('Contract Deployment: ✅', 'green');
  log('Contract Configuration: ✅', 'green');
  log(`RWA Token Setup: ${rwaTokenAddress ? '✅' : '⚠️'}`, rwaTokenAddress ? 'green' : 'yellow');
  
  console.log('\n' + '='.repeat(60));
  log('Next Steps:', 'bright');
  console.log('='.repeat(60));
  
  if (!rwaTokenAddress) {
    log('\n1. Create RWA tokens:', 'blue');
    log('   node scripts/setup-tokens.js\n');
  }

  log('2. Test Oracle:', 'blue');
  log('   node testOracle.js\n');

  log('3. Test Lending:', 'blue');
  log('   node testLending.js\n');

  log('4. Start Backend:', 'blue');
  log('   npm run dev\n');

  log('✅ Setup complete! You\'re ready to start building.\n', 'green');
}

setupContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });