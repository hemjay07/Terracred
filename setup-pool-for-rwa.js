#!/usr/bin/env node
/**
 * Setup lending pool for Master RWA token
 *
 * This script:
 * 1. Sends 1 Master RWA token to the pool (triggers auto-association)
 * 2. Grants KYC to the lending pool
 * 3. Sends the token back to you
 */

const {
  Client,
  AccountId,
  PrivateKey,
  TokenGrantKycTransaction,
  TransferTransaction,
  TokenId,
  Hbar,
  AccountBalanceQuery
} = require("@hashgraph/sdk");
const fs = require('fs');
const path = require('path');

// Read .env file manually
function loadEnv(filePath) {
  const env = {};
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
  // Load configuration from .env file
  const envPath = path.join(__dirname, 'contracts', '.env');
  const env = loadEnv(envPath);

  const accountId = env.HEDERA_ACCOUNT_ID;
  const privateKeyStr = env.HEDERA_PRIVATE_KEY;
  const masterRWATokenId = env.MASTER_RWA_TOKEN_ID || '0.0.7119378';
  const lendingPoolId = env.LENDING_POOL_ID || '0.0.7138337';

  console.log('🔧 Setup Lending Pool for Master RWA Token');
  console.log('==========================================\n');
  console.log('Configuration:');
  console.log(`  Your Account: ${accountId}`);
  console.log(`  Master RWA Token: ${masterRWATokenId}`);
  console.log(`  Lending Pool: ${lendingPoolId}`);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(privateKeyStr.replace('0x', ''));
  client.setOperator(AccountId.fromString(accountId), privateKey);

  // Step 1: Send 1 token to pool to trigger auto-association
  console.log('📤 Step 1: Sending 1 Master RWA token to lending pool...');
  console.log('   (This triggers auto-association)');

  try {
    const sendTx = await new TransferTransaction()
      .addTokenTransfer(masterRWATokenId, accountId, -1)
      .addTokenTransfer(masterRWATokenId, lendingPoolId, 1)
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const sendReceipt = await sendTx.getReceipt(client);
    console.log(`   ✅ Transfer successful! Status: ${sendReceipt.status.toString()}`);
    console.log(`   TX: ${sendTx.transactionId.toString()}`);
  } catch (error) {
    console.error('   ❌ Transfer failed:', error.message);

    if (error.message.includes('ACCOUNT_KYC_NOT_GRANTED')) {
      console.error('\n   ⚠️  You need KYC for this token first!');
      console.error('   ⚠️  Let me grant you KYC...\n');

      // Grant KYC to yourself first
      console.log('🔐 Granting KYC to your account...');
      try {
        const selfKycTx = await new TokenGrantKycTransaction()
          .setTokenId(TokenId.fromString(masterRWATokenId))
          .setAccountId(AccountId.fromString(accountId))
          .setMaxTransactionFee(new Hbar(10))
          .execute(client);

        const selfKycReceipt = await selfKycTx.getReceipt(client);
        console.log(`   ✅ Self-KYC granted! Status: ${selfKycReceipt.status.toString()}`);
        console.log();
        console.log('   Retrying transfer...\n');

        // Retry the transfer
        const retryTx = await new TransferTransaction()
          .addTokenTransfer(masterRWATokenId, accountId, -1)
          .addTokenTransfer(masterRWATokenId, lendingPoolId, 1)
          .setMaxTransactionFee(new Hbar(10))
          .execute(client);

        const retryReceipt = await retryTx.getReceipt(client);
        console.log(`   ✅ Transfer successful! Status: ${retryReceipt.status.toString()}`);
      } catch (kycError) {
        console.error('   ❌ Failed to grant self-KYC:', kycError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }

  console.log();

  // Wait a bit for association to settle
  console.log('⏳ Waiting 3 seconds for association to settle...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 2: Grant KYC to lending pool
  console.log('🔐 Step 2: Granting KYC to lending pool...');

  try {
    const grantKycTx = await new TokenGrantKycTransaction()
      .setTokenId(TokenId.fromString(masterRWATokenId))
      .setAccountId(AccountId.fromString(lendingPoolId))
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const kycReceipt = await grantKycTx.getReceipt(client);
    console.log(`   ✅ KYC granted! Status: ${kycReceipt.status.toString()}`);
    console.log(`   TX: ${grantKycTx.transactionId.toString()}`);
  } catch (error) {
    console.error('   ❌ Failed to grant KYC:', error.message);
    process.exit(1);
  }

  console.log();

  // Step 3: Return the token to you
  console.log('📥 Step 3: Returning the token to your account...');

  try {
    const returnTx = await new TransferTransaction()
      .addTokenTransfer(masterRWATokenId, lendingPoolId, -1)
      .addTokenTransfer(masterRWATokenId, accountId, 1)
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const returnReceipt = await returnTx.getReceipt(client);
    console.log(`   ✅ Return successful! Status: ${returnReceipt.status.toString()}`);
    console.log(`   TX: ${returnTx.transactionId.toString()}`);
  } catch (error) {
    console.error('   ❌ Failed to return token:', error.message);
    console.error('   ⚠️  1 token is still in the lending pool, but that is okay');
  }

  console.log();
  console.log('✅ SUCCESS! Lending pool is now ready for deposits!');
  console.log();
  console.log('📊 Summary:');
  console.log('   ✅ Lending pool is associated with Master RWA token');
  console.log('   ✅ Lending pool has KYC for Master RWA token');
  console.log('   ✅ Users can now deposit Master RWA tokens as collateral');
  console.log();
  console.log('📝 Next steps:');
  console.log('   1. Go to your frontend');
  console.log('   2. Try depositing Master RWA tokens');
  console.log('   3. Then try borrowing heNGN');

  client.close();
}

main().catch(console.error);
