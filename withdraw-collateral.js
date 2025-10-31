#!/usr/bin/env node
/**
 * Emergency collateral withdrawal script
 * Use this to withdraw all your collateral from the lending pool
 */

const {
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  AccountId,
  PrivateKey,
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
  const lendingPoolId = env.LENDING_POOL_ID;

  console.log('🔓 Emergency Collateral Withdrawal');
  console.log('===================================\n');
  console.log('Configuration:');
  console.log(`  Your Account: ${accountId}`);
  console.log(`  Lending Pool: ${lendingPoolId}`);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(privateKeyStr.replace('0x', ''));
  client.setOperator(AccountId.fromString(accountId), privateKey);

  // Amount to withdraw (60M tokens)
  const amount = 60_000_000;

  console.log(`📤 Withdrawing ${amount.toLocaleString()} collateral tokens...`);
  console.log(`⚠️  This requires your wallet signature\n`);

  try {
    const tx = await new ContractExecuteTransaction()
      .setContractId(lendingPoolId)
      .setGas(1000000)
      .setFunction("withdrawCollateral", new ContractFunctionParameters().addUint256(amount))
      .setMaxTransactionFee(new Hbar(10))
      .execute(client);

    const receipt = await tx.getReceipt(client);
    console.log(`  ✅ Withdrawal successful! Status: ${receipt.status.toString()}`);
    console.log(`  Transaction ID: ${tx.transactionId.toString()}`);
    console.log(`\n✅ SUCCESS! Your ${amount.toLocaleString()} collateral tokens have been returned!`);
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Go to the frontend and deposit collateral again`);
    console.log(`  2. Borrow heNGN (should work now with ₦41B in the pool!)`);
    console.log(`  3. Test repayment`);
  } catch (error) {
    console.error('  ❌ Withdrawal failed:', error.message);
    if (error.message.includes('Undercollateralized')) {
      console.error('  → You cannot withdraw while you have an active loan');
      console.error('  → You need to repay the ₦400k loan first (but you don\'t have heNGN!)');
      console.error('\n🚨 SITUATION: You have a phantom loan - debt recorded but no heNGN received');
      console.error('\n💡 SOLUTION: This requires manual intervention. Contact the contract owner to:');
      console.error('     1. Manually reset your loan struct, OR');
      console.error('     2. Transfer heNGN to you so you can repay, OR');
      console.error('     3. Deploy a new contract and start fresh');
    }
    process.exit(1);
  }

  client.close();
}

main().catch(console.error);
