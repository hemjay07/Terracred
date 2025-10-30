#!/usr/bin/env node
/**
 * Check if heNGN token is associated with your wallet
 *
 * This script checks:
 * 1. If heNGN token is associated with your account
 * 2. Your heNGN balance
 * 3. How to associate the token if needed
 */

const {
  Client,
  AccountId,
  PrivateKey,
  AccountBalanceQuery,
  AccountInfoQuery,
  TokenId
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
  console.log('🔍 CHECKING heNGN TOKEN ASSOCIATION');
  console.log('=' .repeat(70));
  console.log();

  // Load configuration
  const contractsEnv = loadEnv(path.join(__dirname, 'contracts', '.env'));
  const backendEnv = loadEnv(path.join(__dirname, 'backend', '.env'));

  const operatorAccountId = contractsEnv.HEDERA_ACCOUNT_ID;
  const operatorPrivateKey = contractsEnv.HEDERA_PRIVATE_KEY;
  const heNGNTokenId = contractsEnv.HENGN_TOKEN_ID || backendEnv.HENGN_TOKEN_ID;

  if (!heNGNTokenId) {
    console.error('❌ heNGN token ID not found in .env files');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Operator Account: ${operatorAccountId}`);
  console.log(`   heNGN Token ID: ${heNGNTokenId}`);
  console.log();

  // Prompt for user account to check
  console.log('👤 Enter the Hedera Account ID to check (your HashPack account):');
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

  // Check heNGN token association
  console.log('TEST 1: Check heNGN token association');
  console.log('-'.repeat(70));

  let isAssociated = false;
  let heNGNBalance = '0';

  try {
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(userAccountId)
      .execute(client);

    if (accountInfo.tokenRelationships) {
      accountInfo.tokenRelationships.forEach((relationship, tokenId) => {
        if (tokenId.toString() === heNGNTokenId) {
          isAssociated = true;
          heNGNBalance = relationship.balance.toString();
          console.log(`   ✅ ASSOCIATED: heNGN token is associated with your account`);
          console.log(`   💰 Balance: ${heNGNBalance} (${(parseFloat(heNGNBalance) / 100).toFixed(2)} heNGN)`);
          console.log(`   🔓 Frozen: ${relationship.isFrozen ? 'Yes' : 'No'}`);
          console.log(`   🔑 KYC: ${relationship.isKycGranted ? 'Yes' : 'No'}`);
        }
      });
    }

    if (!isAssociated) {
      console.log(`   ❌ NOT ASSOCIATED: heNGN token is NOT associated`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking association: ${error.message}`);
  }

  console.log();

  // Summary and instructions
  console.log('=' .repeat(70));
  console.log('📝 SUMMARY');
  console.log('=' .repeat(70));
  console.log();

  if (isAssociated) {
    console.log('✅ heNGN token IS associated with your account!');
    console.log();
    console.log(`💰 Your heNGN balance: ${(parseFloat(heNGNBalance) / 100).toFixed(2)} NGN`);
    console.log();

    if (parseFloat(heNGNBalance) > 0) {
      console.log('🎉 You have heNGN in your wallet!');
      console.log();
      console.log('You should be able to see it in HashPack:');
      console.log('   1. Open HashPack wallet');
      console.log('   2. Go to "Tokens" tab');
      console.log(`   3. Look for heNGN (${heNGNTokenId})`);
      console.log();
    } else {
      console.log('ℹ️  Your heNGN balance is 0');
      console.log();
      console.log('You have associated the token but haven\'t borrowed yet.');
      console.log('Go to http://localhost:3000/borrow to borrow heNGN!');
      console.log();
    }
  } else {
    console.log('❌ heNGN token is NOT associated with your account!');
    console.log();
    console.log('📚 How to associate heNGN token:');
    console.log();
    console.log('Method 1: Through HashPack (RECOMMENDED)');
    console.log('   1. Open your HashPack wallet');
    console.log('   2. Go to the "Tokens" tab');
    console.log('   3. Click "Associate Token" button');
    console.log(`   4. Enter token ID: ${heNGNTokenId}`);
    console.log('   5. Confirm the association (costs ~$0.05 in HBAR)');
    console.log();
    console.log('Method 2: Automatic on first borrow');
    console.log('   • The frontend will automatically associate heNGN when you borrow');
    console.log('   • You\'ll need to sign the association transaction');
    console.log();
    console.log('⚠️  IMPORTANT: You must associate heNGN BEFORE borrowing,');
    console.log('   otherwise the borrowed tokens cannot be sent to your wallet!');
    console.log();
  }

  console.log('=' .repeat(70));
  console.log('💡 NEXT STEPS');
  console.log('=' .repeat(70));
  console.log();

  if (isAssociated) {
    console.log('✅ You\'re all set! You can:');
    console.log('   • View your heNGN balance in HashPack');
    console.log('   • Borrow more heNGN if you have collateral');
    console.log('   • Use heNGN for transactions');
    console.log();
  } else {
    console.log('⏳ Please associate the heNGN token first, then:');
    console.log('   • Run this script again to verify');
    console.log('   • Go to the borrow page to get heNGN');
    console.log();
  }

  client.close();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
