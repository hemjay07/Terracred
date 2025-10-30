#!/usr/bin/env node
/**
 * Whitelist a token in the LendingPool contract
 *
 * This script calls addSupportedToken() on the LendingPool contract
 * to whitelist a property token for use as collateral.
 *
 * Usage: node whitelist-token.js <TOKEN_ID>
 * Example: node whitelist-token.js 0.0.7162666
 */

const {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractFunctionParameters,
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
    console.error('Usage: node whitelist-token.js <TOKEN_ID>');
    console.error('Example: node whitelist-token.js 0.0.7162666');
    process.exit(1);
  }

  console.log('✅ Whitelisting Token in LendingPool Contract');
  console.log('=' .repeat(70));
  console.log();

  // Load configuration
  const envPath = path.join(__dirname, 'contracts', '.env');
  const env = loadEnv(envPath);

  const operatorAccountId = env.HEDERA_ACCOUNT_ID;
  const operatorPrivateKey = env.HEDERA_PRIVATE_KEY;
  const lendingPoolId = '0.0.7138337';

  console.log('Configuration:');
  console.log(`  Operator Account: ${operatorAccountId}`);
  console.log(`  Lending Pool: ${lendingPoolId}`);
  console.log(`  Token to Whitelist: ${tokenIdArg}`);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(operatorPrivateKey.replace('0x', ''));
  client.setOperator(AccountId.fromString(operatorAccountId), privateKey);

  try {
    // Convert token ID to EVM address
    const tokenId = TokenId.fromString(tokenIdArg);
    const tokenEvmAddress = tokenId.toSolidityAddress();

    console.log('🔄 Step 1: Preparing contract call...');
    console.log(`   Token EVM Address: 0x${tokenEvmAddress}`);
    console.log();

    // Call addSupportedToken(address token)
    const contractExecTx = new ContractExecuteTransaction()
      .setContractId(lendingPoolId)
      .setGas(100000)
      .setFunction(
        "addSupportedToken",
        new ContractFunctionParameters().addAddress(tokenEvmAddress)
      )
      .setMaxTransactionFee(new Hbar(2));

    console.log('🔄 Step 2: Executing transaction...');
    const submitTx = await contractExecTx.execute(client);

    console.log('🔄 Step 3: Waiting for receipt...');
    const receipt = await submitTx.getReceipt(client);

    console.log();
    console.log('✅ SUCCESS! Token whitelisted!');
    console.log('=' .repeat(70));
    console.log(`  Status: ${receipt.status.toString()}`);
    console.log(`  Transaction ID: ${submitTx.transactionId.toString()}`);
    console.log(`  Token ID: ${tokenIdArg}`);
    console.log(`  Token EVM Address: 0x${tokenEvmAddress}`);
    console.log();
    console.log('💡 You can now deposit this token as collateral!');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log();

    if (error.message.includes('CONTRACT_REVERT_EXECUTED')) {
      console.log('⚠️  Possible causes:');
      console.log('   1. You\'re not the contract owner');
      console.log('   2. Token is already whitelisted');
      console.log('   3. Invalid token address');
      console.log();
    }

    process.exit(1);
  }

  client.close();
}

main().catch(console.error);
