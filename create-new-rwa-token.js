#!/usr/bin/env node
/**
 * Create a new Master RWA token WITHOUT KYC requirement
 *
 * This script will:
 * 1. Create a new fungible token (Master RWA v2)
 * 2. Mint tokens to your account
 * 3. Send 1 token to the lending pool (triggers auto-association)
 * 4. Show you what to update in your .env files
 */

const {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenMintTransaction,
  TransferTransaction,
  TokenType,
  TokenSupplyType,
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
  const lendingPoolId = '0.0.7138337';

  console.log('🎨 Creating New Master RWA Token (No KYC)');
  console.log('=========================================\n');
  console.log('Configuration:');
  console.log(`  Treasury Account: ${accountId}`);
  console.log(`  Lending Pool: ${lendingPoolId}`);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(privateKeyStr.replace('0x', ''));
  client.setOperator(AccountId.fromString(accountId), privateKey);

  // Step 1: Create token
  console.log('🎨 Step 1: Creating new Master RWA token...');
  console.log('   Name: TerraCred Property Token v2');
  console.log('   Symbol: TCRED');
  console.log('   Decimals: 0 (NFT-like fungible token)');
  console.log('   Supply: INFINITE');
  console.log('   KYC: NONE (removed for easier testing)');
  console.log();

  let newTokenId;
  try {
    const tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName("TerraCred Property Token v2")
      .setTokenSymbol("TCRED")
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(AccountId.fromString(accountId))
      .setSupplyType(TokenSupplyType.Infinite)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyKey(privateKey)
      .setAdminKey(privateKey)
      // NO KYC KEY - This is the key change!
      .setMaxTransactionFee(new Hbar(50))
      .freezeWith(client);

    const signedTx = await tokenCreateTx.sign(privateKey);
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    newTokenId = receipt.tokenId.toString();
    const evmAddress = '0x' + receipt.tokenId.toSolidityAddress();

    console.log('   ✅ Token created successfully!');
    console.log(`   Token ID: ${newTokenId}`);
    console.log(`   EVM Address: ${evmAddress}`);
    console.log(`   TX: ${response.transactionId.toString()}`);
  } catch (error) {
    console.error('   ❌ Token creation failed:', error.message);
    process.exit(1);
  }

  console.log();

  // Step 2: Mint tokens
  const mintAmount = 10000; // 10,000 tokens
  console.log(`💰 Step 2: Minting ${mintAmount} tokens to your account...`);

  try {
    const mintTx = await new TokenMintTransaction()
      .setTokenId(TokenId.fromString(newTokenId))
      .setAmount(mintAmount)
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const mintReceipt = await mintTx.getReceipt(client);
    console.log(`   ✅ Minted successfully!`);
    console.log(`   Status: ${mintReceipt.status.toString()}`);
    console.log(`   TX: ${mintTx.transactionId.toString()}`);
  } catch (error) {
    console.error('   ❌ Minting failed:', error.message);
    process.exit(1);
  }

  console.log();

  // Step 3: Send 1 token to lending pool
  console.log('📤 Step 3: Sending 1 token to lending pool...');
  console.log('   (This triggers auto-association)');

  try {
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(newTokenId, accountId, -1)
      .addTokenTransfer(newTokenId, lendingPoolId, 1)
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const transferReceipt = await transferTx.getReceipt(client);
    console.log(`   ✅ Transfer successful!`);
    console.log(`   Status: ${transferReceipt.status.toString()}`);
    console.log(`   TX: ${transferTx.transactionId.toString()}`);
  } catch (error) {
    console.error('   ❌ Transfer failed:', error.message);
    console.error('   The token might still work, continuing...');
  }

  console.log();

  // Step 4: Check balances
  console.log('📊 Step 4: Verifying balances...');

  const yourBalance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  const yourTokens = yourBalance.tokens?.get(TokenId.fromString(newTokenId)) || 0;

  const poolBalance = await new AccountBalanceQuery()
    .setAccountId(lendingPoolId)
    .execute(client);
  const poolTokens = poolBalance.tokens?.get(TokenId.fromString(newTokenId)) || 0;

  console.log(`   Your balance: ${yourTokens} TCRED`);
  console.log(`   Pool balance: ${poolTokens} TCRED`);

  console.log();
  console.log('=' * 70);
  console.log('✅ SUCCESS! New Master RWA token created and configured!');
  console.log('=' * 70);
  console.log();
  console.log('📝 NEXT STEPS - Update your configuration:');
  console.log();
  console.log('1️⃣  Update contracts/.env:');
  console.log('   ----------------------------------------');
  console.log(`   MASTER_RWA_TOKEN_ID=${newTokenId}`);
  console.log(`   MASTER_RWA_TOKEN_ADDRESS=${TokenId.fromString(newTokenId).toSolidityAddress()}`);
  console.log();
  console.log('2️⃣  Update frontend/constants/index.ts:');
  console.log('   ----------------------------------------');
  console.log(`   MASTER_RWA_TOKEN_ID: '${newTokenId}',`);
  console.log(`   MASTER_RWA_TOKEN_ADDRESS: '0x${TokenId.fromString(newTokenId).toSolidityAddress()}',`);
  console.log();
  console.log('3️⃣  Restart your frontend:');
  console.log('   ----------------------------------------');
  console.log('   cd frontend');
  console.log('   # Press Ctrl+C if running');
  console.log('   npm run dev');
  console.log();
  console.log('4️⃣  Test the full flow:');
  console.log('   ----------------------------------------');
  console.log('   • Go to frontend');
  console.log('   • Deposit collateral (should work now!)');
  console.log('   • Borrow heNGN (should work now!)');
  console.log();
  console.log('💡 The old Master RWA token still exists, but we\'re using');
  console.log('   this new one to avoid the KYC deadlock issue.');
  console.log();

  client.close();
}

main().catch(console.error);
