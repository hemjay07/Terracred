#!/usr/bin/env node
/**
 * Grant KYC to the lending pool for Master RWA token
 *
 * This script grants KYC approval to the lending pool contract so it can
 * receive Master RWA tokens from users who deposit collateral.
 */

const {
  Client,
  AccountId,
  PrivateKey,
  TokenGrantKycTransaction,
  TokenId,
  Hbar
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

  console.log('🔐 Grant KYC to Lending Pool');
  console.log('============================\n');
  console.log('Configuration:');
  console.log(`  Your Account: ${accountId}`);
  console.log(`  Master RWA Token: ${masterRWATokenId}`);
  console.log(`  Lending Pool: ${lendingPoolId}`);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(privateKeyStr.replace('0x', ''));
  client.setOperator(AccountId.fromString(accountId), privateKey);

  console.log('📝 Granting KYC to lending pool for Master RWA token...');

  try {
    const grantKycTx = await new TokenGrantKycTransaction()
      .setTokenId(TokenId.fromString(masterRWATokenId))
      .setAccountId(AccountId.fromString(lendingPoolId))
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const receipt = await grantKycTx.getReceipt(client);

    console.log(`✅ KYC granted successfully!`);
    console.log(`   Status: ${receipt.status.toString()}`);
    console.log(`   Transaction ID: ${grantKycTx.transactionId.toString()}`);
    console.log();
    console.log('🎉 The lending pool can now receive Master RWA tokens!');
    console.log();
    console.log('📝 Next steps:');
    console.log('  1. Go to your frontend');
    console.log('  2. Try depositing Master RWA tokens again');
    console.log('  3. The deposit should work now!');

  } catch (error) {
    console.error('❌ Failed to grant KYC:', error.message);

    if (error.message.includes('INVALID_SIGNATURE')) {
      console.error('\n❌ Your private key does not have KYC authority for this token');
    } else if (error.message.includes('INVALID_TOKEN_ID')) {
      console.error('\n❌ The Master RWA token ID might be wrong');
    } else if (error.message.includes('INVALID_ACCOUNT_ID')) {
      console.error('\n❌ The lending pool account ID might be wrong');
    }

    process.exit(1);
  }

  client.close();
}

main().catch(console.error);
