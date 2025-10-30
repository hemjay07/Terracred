#!/usr/bin/env node
/**
 * DIAGNOSTIC SCRIPT: Deposit Collateral Issue
 *
 * This script will check:
 * 1. Your token balances
 * 2. Token associations with your account
 * 3. Token associations with the lending pool
 * 4. Which tokens are whitelisted in the lending pool contract
 * 5. Token allowances (approvals)
 */

const {
  Client,
  AccountId,
  PrivateKey,
  AccountBalanceQuery,
  AccountInfoQuery,
  TokenId,
  ContractCallQuery,
  ContractFunctionParameters
} = require("@hashgraph/sdk");
const fs = require('fs');
const path = require('path');

// Read .env file manually
function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Warning: ${filePath} not found`);
    return env;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

async function main() {
  console.log('🔍 DEPOSIT COLLATERAL DIAGNOSTIC');
  console.log('=' .repeat(70));
  console.log();

  // Load configuration
  const envPath = path.join(__dirname, 'contracts', '.env');
  const env = loadEnv(envPath);

  const operatorAccountId = env.HEDERA_ACCOUNT_ID;
  const operatorPrivateKey = env.HEDERA_PRIVATE_KEY;
  const lendingPoolId = '0.0.7138337';
  const masterTokenId = env.MASTER_RWA_TOKEN_ID || '0.0.7162666';

  console.log('📋 Configuration:');
  console.log(`   Operator Account: ${operatorAccountId}`);
  console.log(`   Lending Pool: ${lendingPoolId}`);
  console.log(`   Master RWA Token: ${masterTokenId}`);
  console.log();

  // Prompt for user account to check
  console.log('👤 Enter the Hedera Account ID you\'re trying to deposit from:');
  console.log('   (Press Enter to use operator account: ' + operatorAccountId + ')');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const userAccountId = await new Promise((resolve) => {
    rl.question('   Account ID: ', (answer) => {
      rl.close();
      resolve(answer.trim() || operatorAccountId);
    });
  });

  console.log();
  console.log('🔍 Checking account: ' + userAccountId);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(operatorPrivateKey.replace('0x', ''));
  client.setOperator(AccountId.fromString(operatorAccountId), privateKey);

  // Step 1: Check user's token balances
  console.log('📊 Step 1: Checking your token balances...');
  console.log('-'.repeat(70));

  try {
    const balanceQuery = await new AccountBalanceQuery()
      .setAccountId(userAccountId)
      .execute(client);

    console.log(`   HBAR Balance: ${balanceQuery.hbar.toString()}`);
    console.log();

    if (balanceQuery.tokens && balanceQuery.tokens.size > 0) {
      console.log('   Token Balances:');
      balanceQuery.tokens.forEach((balance, tokenId) => {
        const isMaster = tokenId.toString() === masterTokenId;
        const marker = isMaster ? ' ⭐ (MASTER RWA)' : '';
        console.log(`   - ${tokenId.toString()}: ${balance.toString()}${marker}`);
      });
    } else {
      console.log('   ❌ No tokens associated with this account!');
      console.log('   💡 You need to associate tokens before you can receive or use them.');
    }
    console.log();
  } catch (error) {
    console.error('   ❌ Error checking balance:', error.message);
    console.log();
  }

  // Step 2: Check token associations
  console.log('🔗 Step 2: Checking token associations...');
  console.log('-'.repeat(70));

  try {
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(userAccountId)
      .execute(client);

    if (accountInfo.tokenRelationships && accountInfo.tokenRelationships.size > 0) {
      console.log('   Associated Tokens:');
      accountInfo.tokenRelationships.forEach((relationship, tokenId) => {
        const isMaster = tokenId.toString() === masterTokenId;
        const marker = isMaster ? ' ⭐ (MASTER RWA)' : '';
        console.log(`   ✓ ${tokenId.toString()}${marker}`);
        console.log(`     - Balance: ${relationship.balance.toString()}`);
        console.log(`     - Frozen: ${relationship.isFrozen}`);
        console.log(`     - KYC: ${relationship.isKycGranted}`);
      });
    } else {
      console.log('   ❌ No tokens associated!');
    }
    console.log();
  } catch (error) {
    console.error('   ❌ Error checking associations:', error.message);
    console.log();
  }

  // Step 3: Check lending pool's token associations
  console.log('🏦 Step 3: Checking lending pool token associations...');
  console.log('-'.repeat(70));

  try {
    const poolInfo = await new AccountInfoQuery()
      .setAccountId(lendingPoolId)
      .execute(client);

    if (poolInfo.tokenRelationships && poolInfo.tokenRelationships.size > 0) {
      console.log('   Lending Pool Associated Tokens:');
      poolInfo.tokenRelationships.forEach((relationship, tokenId) => {
        const isMaster = tokenId.toString() === masterTokenId;
        const marker = isMaster ? ' ⭐ (MASTER RWA)' : '';
        console.log(`   ✓ ${tokenId.toString()}${marker}`);
        console.log(`     - Balance: ${relationship.balance.toString()}`);
      });
    } else {
      console.log('   ❌ No tokens associated with lending pool!');
    }
    console.log();
  } catch (error) {
    console.error('   ❌ Error checking pool associations:', error.message);
    console.log();
  }

  // Step 4: Check if tokens are whitelisted in the contract
  console.log('✅ Step 4: Checking which tokens are whitelisted in the contract...');
  console.log('-'.repeat(70));
  console.log('   Note: This requires querying the contract\'s supportedTokens mapping');
  console.log('   We\'ll check the Master RWA token...');
  console.log();

  try {
    // Convert token ID to EVM address for contract query
    const masterTokenEvmAddress = TokenId.fromString(masterTokenId).toSolidityAddress();

    // Query the supportedTokens mapping
    // supportedTokens(address token) returns (bool)
    const query = new ContractCallQuery()
      .setContractId(lendingPoolId)
      .setGas(50000)
      .setFunction(
        "supportedTokens",
        new ContractFunctionParameters().addAddress(masterTokenEvmAddress)
      );

    const result = await query.execute(client);
    const isSupported = result.getBool(0);

    console.log(`   Master RWA Token (${masterTokenId}):`);
    console.log(`   - EVM Address: 0x${masterTokenEvmAddress}`);
    console.log(`   - Supported: ${isSupported ? '✅ YES' : '❌ NO'}`);
    console.log();

    if (!isSupported) {
      console.log('   ⚠️  WARNING: The Master RWA token is NOT whitelisted in the contract!');
      console.log('   💡 You need to call addSupportedToken() to whitelist it.');
      console.log();
    }
  } catch (error) {
    console.error('   ❌ Error checking contract whitelist:', error.message);
    console.log('   💡 This might be because the contract doesn\'t have this function exposed.');
    console.log();
  }

  // Summary and Recommendations
  console.log('=' .repeat(70));
  console.log('📝 SUMMARY & RECOMMENDATIONS');
  console.log('=' .repeat(70));
  console.log();

  console.log('⚠️  COMMON ISSUES & FIXES:');
  console.log();

  console.log('1. TOKEN NOT ASSOCIATED WITH YOUR ACCOUNT');
  console.log('   Problem: You don\'t have the property token associated');
  console.log('   Fix: Open HashPack → Tokens → Associate Token → Enter token ID');
  console.log();

  console.log('2. TOKEN NOT ASSOCIATED WITH LENDING POOL');
  console.log('   Problem: The lending pool contract doesn\'t have the token associated');
  console.log('   Fix: Send 1 token to the lending pool to trigger auto-association:');
  console.log('      node send-token-to-pool.js [TOKEN_ID]');
  console.log();

  console.log('3. TOKEN NOT WHITELISTED IN CONTRACT');
  console.log('   Problem: The token is not in the supportedTokens mapping');
  console.log('   Fix: Call addSupportedToken() as contract owner:');
  console.log('      node whitelist-token.js [TOKEN_ID]');
  console.log();

  console.log('4. INSUFFICIENT APPROVAL');
  console.log('   Problem: You haven\'t approved the lending pool to spend your tokens');
  console.log('   Fix: The frontend should handle this automatically, but verify:');
  console.log('      - Check the approval transaction was successful');
  console.log('      - Wait 5-10 seconds after approval before depositing');
  console.log();

  console.log('5. TOKEN ID MISMATCH IN CONFIG');
  console.log('   Problem: Your .env files have different token IDs');
  console.log('   Fix: Ensure all config files use the same token ID:');
  console.log(`      - contracts/.env: ${masterTokenId}`);
  console.log(`      - frontend/constants/index.ts: ${masterTokenId}`);
  console.log(`      - frontend/.env.local: ${masterTokenId}`);
  console.log();

  console.log('💡 NEXT STEPS:');
  console.log();
  console.log('   Based on the output above, identify which issue you have and run');
  console.log('   the corresponding fix script.');
  console.log();
  console.log('   Need more help? Check the transaction on HashScan:');
  console.log('   https://hashscan.io/testnet/transaction/[YOUR_TX_ID]');
  console.log();

  client.close();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
