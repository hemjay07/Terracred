#!/usr/bin/env node
/**
 * TEST DEPOSIT FLOW
 *
 * This script tests the complete deposit flow:
 * 1. Check if user has the Master RWA token
 * 2. Check if token is associated with user's account
 * 3. Check if token is associated with lending pool
 * 4. Check if token is whitelisted in the contract
 * 5. Attempt a test approval
 * 6. Show what needs to be fixed
 */

const {
  Client,
  AccountId,
  PrivateKey,
  AccountBalanceQuery,
  AccountInfoQuery,
  ContractCallQuery,
  ContractFunctionParameters,
  TokenId,
  AccountAllowanceApproveTransaction,
  Hbar
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
  console.log('🧪 TESTING DEPOSIT FLOW');
  console.log('='.repeat(70));
  console.log();

  // Load configuration
  const contractsEnv = loadEnv(path.join(__dirname, 'contracts', '.env'));
  const backendEnv = loadEnv(path.join(__dirname, 'backend', '.env'));

  const operatorAccountId = contractsEnv.HEDERA_ACCOUNT_ID;
  const operatorPrivateKey = contractsEnv.HEDERA_PRIVATE_KEY;
  const lendingPoolId = '0.0.7138337';
  const masterTokenIdContracts = contractsEnv.MASTER_RWA_TOKEN_ID;
  const masterTokenIdBackend = backendEnv.MASTER_RWA_TOKEN_ID;

  console.log('📋 Configuration Check:');
  console.log(`   contracts/.env Master Token: ${masterTokenIdContracts}`);
  console.log(`   backend/.env Master Token:   ${masterTokenIdBackend}`);

  if (masterTokenIdContracts !== masterTokenIdBackend) {
    console.log('   ❌ MISMATCH! Backend and contracts have different token IDs!');
    console.log('   💡 Fix this before continuing.');
    process.exit(1);
  } else {
    console.log('   ✅ Token IDs match!');
  }
  console.log();

  const masterTokenId = masterTokenIdContracts;

  // Prompt for user account to test
  console.log('👤 Enter the Hedera Account ID to test (your HashPack account):');
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
  console.log('🧪 Testing with account: ' + userAccountId);
  console.log('🎯 Master RWA Token: ' + masterTokenId);
  console.log('🏦 Lending Pool: ' + lendingPoolId);
  console.log();

  // Create client
  const client = Client.forTestnet();
  const privateKey = PrivateKey.fromStringECDSA(operatorPrivateKey.replace('0x', ''));
  client.setOperator(AccountId.fromString(operatorAccountId), privateKey);

  let allChecksPass = true;

  // TEST 1: Check user's token balance
  console.log('TEST 1: Check user has Master RWA tokens');
  console.log('-'.repeat(70));
  try {
    const balanceQuery = await new AccountBalanceQuery()
      .setAccountId(userAccountId)
      .execute(client);

    const tokenBalance = balanceQuery.tokens?.get(TokenId.fromString(masterTokenId));

    if (tokenBalance && tokenBalance.toNumber() > 0) {
      console.log(`   ✅ PASS: User has ${tokenBalance.toString()} tokens`);
    } else {
      console.log(`   ❌ FAIL: User has 0 tokens`);
      console.log(`   💡 Fix: Verify a property to mint tokens to this account`);
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Error checking balance: ${error.message}`);
    allChecksPass = false;
  }
  console.log();

  // TEST 2: Check token association with user
  console.log('TEST 2: Check token is associated with user account');
  console.log('-'.repeat(70));
  try {
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(userAccountId)
      .execute(client);

    let tokenFound = false;
    if (accountInfo.tokenRelationships) {
      accountInfo.tokenRelationships.forEach((relationship, tokenId) => {
        if (tokenId.toString() === masterTokenId) {
          tokenFound = true;
          console.log(`   ✅ PASS: Token is associated`);
          console.log(`      Balance: ${relationship.balance.toString()}`);
          console.log(`      Frozen: ${relationship.isFrozen}`);
          console.log(`      KYC: ${relationship.isKycGranted}`);
        }
      });
    }

    if (!tokenFound) {
      console.log(`   ❌ FAIL: Token not associated with user account`);
      console.log(`   💡 Fix: Open HashPack → Tokens → Associate Token → ${masterTokenId}`);
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Error checking association: ${error.message}`);
    allChecksPass = false;
  }
  console.log();

  // TEST 3: Check token association with lending pool
  console.log('TEST 3: Check token is associated with lending pool');
  console.log('-'.repeat(70));
  try {
    const poolInfo = await new AccountInfoQuery()
      .setAccountId(lendingPoolId)
      .execute(client);

    let tokenFound = false;
    if (poolInfo.tokenRelationships) {
      poolInfo.tokenRelationships.forEach((relationship, tokenId) => {
        if (tokenId.toString() === masterTokenId) {
          tokenFound = true;
          console.log(`   ✅ PASS: Token is associated with lending pool`);
          console.log(`      Pool Balance: ${relationship.balance.toString()}`);
        }
      });
    }

    if (!tokenFound) {
      console.log(`   ❌ FAIL: Token not associated with lending pool`);
      console.log(`   💡 Fix: Run: node send-token-to-pool.js ${masterTokenId}`);
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Error checking pool association: ${error.message}`);
    allChecksPass = false;
  }
  console.log();

  // TEST 4: Check token is whitelisted in contract
  console.log('TEST 4: Check token is whitelisted in lending pool contract');
  console.log('-'.repeat(70));
  try {
    const masterTokenEvmAddress = TokenId.fromString(masterTokenId).toSolidityAddress();

    const query = new ContractCallQuery()
      .setContractId(lendingPoolId)
      .setGas(50000)
      .setFunction(
        "supportedTokens",
        new ContractFunctionParameters().addAddress(masterTokenEvmAddress)
      );

    const result = await query.execute(client);
    const isSupported = result.getBool(0);

    if (isSupported) {
      console.log(`   ✅ PASS: Token is whitelisted in contract`);
    } else {
      console.log(`   ❌ FAIL: Token is NOT whitelisted in contract`);
      console.log(`   💡 Fix: Run: node whitelist-token.js ${masterTokenId}`);
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Error checking whitelist: ${error.message}`);
    allChecksPass = false;
  }
  console.log();

  // TEST 5: Try to approve tokens (if user is operator)
  if (userAccountId === operatorAccountId) {
    console.log('TEST 5: Test token approval');
    console.log('-'.repeat(70));
    try {
      const approvalTx = new AccountAllowanceApproveTransaction()
        .approveTokenAllowance(
          TokenId.fromString(masterTokenId),
          AccountId.fromString(userAccountId),
          AccountId.fromString(lendingPoolId),
          10
        )
        .setMaxTransactionFee(new Hbar(2));

      const frozenTx = await approvalTx.freezeWith(client);
      const signedTx = await frozenTx.sign(privateKey);
      const response = await signedTx.execute(client);
      const receipt = await response.getReceipt(client);

      console.log(`   ✅ PASS: Approval transaction successful`);
      console.log(`      Status: ${receipt.status.toString()}`);
      console.log(`      TX ID: ${response.transactionId.toString()}`);
    } catch (error) {
      console.log(`   ❌ FAIL: Approval failed: ${error.message}`);
      allChecksPass = false;
    }
    console.log();
  }

  // FINAL SUMMARY
  console.log('='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log();

  if (allChecksPass) {
    console.log('✅ ALL TESTS PASSED!');
    console.log();
    console.log('🎉 Your setup is correct. Deposit should work now!');
    console.log();
    console.log('📝 Next steps:');
    console.log('   1. Go to your frontend: http://localhost:3000');
    console.log('   2. Connect your wallet');
    console.log('   3. Go to Borrow page');
    console.log('   4. Try to deposit collateral');
    console.log();
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log();
    console.log('💡 Follow the fix suggestions above to resolve issues.');
    console.log();
    console.log('📝 Common fixes:');
    console.log('   • Associate token: HashPack → Tokens → Associate → ' + masterTokenId);
    console.log('   • Send to pool: node send-token-to-pool.js ' + masterTokenId);
    console.log('   • Whitelist token: node whitelist-token.js ' + masterTokenId);
    console.log('   • Mint tokens: Verify a property through admin page');
    console.log();
  }

  client.close();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
