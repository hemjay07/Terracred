#!/usr/bin/env node
/**
 * Send 1 token to the Lending Pool to trigger auto-association
 *
 * When you send a token to a contract, it automatically associates
 * that token with the contract (if auto-association is enabled).
 *
 * Usage: node send-token-to-pool.js <TOKEN_ID>
 * Example: node send-token-to-pool.js 0.0.7162666
 */

const {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
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
  // Get token ID from command line
  const tokenIdArg = process.argv[2];
  if (!tokenIdArg) {
    console.error('❌ Error: Please provide a token ID');
    console.error('Usage: node send-token-to-pool.js <TOKEN_ID>');
    console.error('Example: node send-token-to-pool.js 0.0.7162666');
    process.exit(1);
  }

  console.log('📤 Sending Token to Lending Pool (Auto-Association)');
  console.log('=' .repeat(70));
  console.log();

  // Load configuration
  const envPath = path.join(__dirname, 'contracts', '.env');
  const env = loadEnv(envPath);

  const senderAccountId = env.HEDERA_ACCOUNT_ID;
  const senderPrivateKey = env.HEDERA_PRIVATE_KEY;
  const lendingPoolId = '0.0.7138337';

  console.log('Configuration:');
  console.log(`  Sender Account: ${senderAccountId}`);
  console.log(`  Lending Pool: ${lendingPoolId}`);
  console.log(`  Token: ${tokenIdArg}`);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(senderPrivateKey.replace('0x', ''));
  client.setOperator(AccountId.fromString(senderAccountId), privateKey);

  try {
    console.log('🔄 Step 1: Preparing token transfer...');
    console.log('   Sending 1 token from your account to the lending pool');
    console.log('   This will trigger auto-association if enabled');
    console.log();

    // Send 1 token
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(tokenIdArg, senderAccountId, -1)
      .addTokenTransfer(tokenIdArg, lendingPoolId, 1)
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    console.log('🔄 Step 2: Waiting for receipt...');
    const receipt = await transferTx.getReceipt(client);

    console.log();
    console.log('✅ SUCCESS! Token sent to lending pool!');
    console.log('=' .repeat(70));
    console.log(`  Status: ${receipt.status.toString()}`);
    console.log(`  Transaction ID: ${transferTx.transactionId.toString()}`);
    console.log();
    console.log('💡 The lending pool should now be associated with this token!');
    console.log('   Run diagnose-deposit-issue.js to verify.');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log();

    if (error.message.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
      console.log('⚠️  You don\'t have this token associated with your account.');
      console.log('   First associate the token in HashPack:');
      console.log('   1. Open HashPack → Tokens → Associate Token');
      console.log(`   2. Enter token ID: ${tokenIdArg}`);
      console.log('   3. Confirm the association');
      console.log();
    } else if (error.message.includes('INSUFFICIENT_TOKEN_BALANCE')) {
      console.log('⚠️  You don\'t have any tokens to send.');
      console.log('   You need at least 1 token in your account to trigger association.');
      console.log();
    } else if (error.message.includes('NO_REMAINING_AUTOMATIC_ASSOCIATIONS')) {
      console.log('⚠️  The lending pool has run out of automatic association slots.');
      console.log('   This is unlikely but possible. You may need to manually associate');
      console.log('   the token with the contract using a different method.');
      console.log();
    }

    process.exit(1);
  }

  client.close();
}

main().catch(console.error);
