#!/usr/bin/env node
/**
 * Mint heNGN tokens and fund the lending pool
 *
 * This script will:
 * 1. Mint heNGN tokens to your treasury account
 * 2. Transfer heNGN to the lending pool so users can borrow
 */

const {
  Client,
  AccountId,
  PrivateKey,
  TokenMintTransaction,
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
  const heNGNTokenId = env.HENGN_TOKEN_ID || '0.0.7111468';
  const lendingPoolId = env.LENDING_POOL_ID || '0.0.7138337';

  console.log('🏦 heNGN Minting & Lending Pool Funding');
  console.log('=====================================\n');
  console.log('Configuration:');
  console.log(`  Treasury Account: ${accountId}`);
  console.log(`  heNGN Token ID: ${heNGNTokenId}`);
  console.log(`  Lending Pool ID: ${lendingPoolId}`);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(privateKeyStr.replace('0x', ''));
  client.setOperator(AccountId.fromString(accountId), privateKey);

  // Step 1: Check current supply
  console.log('📊 Checking current token supply...');
  const treasuryBalance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  const currentSupply = treasuryBalance.tokens?.get(TokenId.fromString(heNGNTokenId)) || 0;
  console.log(`  Current heNGN in treasury: ${currentSupply}`);

  // Step 2: Mint heNGN tokens
  const mintAmount = 10_000_000_00; // 10 million heNGN (2 decimals)
  console.log(`\n💰 Minting ${mintAmount / 100} heNGN tokens...`);

  try {
    const mintTx = await new TokenMintTransaction()
      .setTokenId(heNGNTokenId)
      .setAmount(mintAmount)
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const mintReceipt = await mintTx.getReceipt(client);
    console.log(`  ✅ Mint successful! Status: ${mintReceipt.status.toString()}`);
    console.log(`  Transaction ID: ${mintTx.transactionId.toString()}`);
  } catch (error) {
    console.error('  ❌ Mint failed:', error.message);
    if (error.message.includes('INVALID_TOKEN_ID')) {
      console.error('  → The heNGN token ID in your .env might be wrong');
    } else if (error.message.includes('INVALID_SIGNATURE')) {
      console.error('  → Your private key does not have minting rights for this token');
    }
    process.exit(1);
  }

  // Step 3: Check new balance
  const newBalance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  const newSupply = newBalance.tokens?.get(TokenId.fromString(heNGNTokenId)) || 0;
  console.log(`  New heNGN in treasury: ${newSupply}`);

  // Step 4: Transfer to lending pool
  const transferAmount = 5_000_000_00; // 5 million heNGN to the pool
  console.log(`\n🏦 Transferring ${transferAmount / 100} heNGN to lending pool...`);

  try {
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(heNGNTokenId, accountId, -transferAmount)
      .addTokenTransfer(heNGNTokenId, lendingPoolId, transferAmount)
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const transferReceipt = await transferTx.getReceipt(client);
    console.log(`  ✅ Transfer successful! Status: ${transferReceipt.status.toString()}`);
    console.log(`  Transaction ID: ${transferTx.transactionId.toString()}`);
  } catch (error) {
    console.error('  ❌ Transfer failed:', error.message);
    if (error.message.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
      console.error('  → The lending pool needs to be associated with heNGN first');
      console.error('  → This should happen automatically due to unlimited auto-associations');
    }
    process.exit(1);
  }

  // Step 5: Verify pool balance
  console.log('\n📊 Final balances:');

  const finalTreasuryBalance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  const treasuryHeNGN = finalTreasuryBalance.tokens?.get(TokenId.fromString(heNGNTokenId)) || 0;
  console.log(`  Treasury (${accountId}): ${treasuryHeNGN} heNGN`);

  const finalPoolBalance = await new AccountBalanceQuery()
    .setAccountId(lendingPoolId)
    .execute(client);
  const poolHeNGN = finalPoolBalance.tokens?.get(TokenId.fromString(heNGNTokenId)) || 0;
  console.log(`  Lending Pool (${lendingPoolId}): ${poolHeNGN} heNGN`);

  console.log('\n✅ SUCCESS! The lending pool is now funded and ready to lend!');
  console.log('\n📝 Next steps:');
  console.log('  1. Go to your frontend');
  console.log('  2. Deposit Master RWA token as collateral');
  console.log('  3. Borrow heNGN (should work now!)');

  client.close();
}

main().catch(console.error);
