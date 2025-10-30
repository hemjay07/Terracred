#!/usr/bin/env node
/**
 * Test getLoanDetails via Hedera Mirror Node
 *
 * This script tests the mirror node API call to verify:
 * 1. Mirror node is accessible
 * 2. Contract ID is correct
 * 3. Function selector is correct
 * 4. Response can be decoded
 */

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

// Convert Hedera ID to EVM address
function hederaIdToEvmAddress(hederaId) {
  const parts = hederaId.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid Hedera ID format: ${hederaId}`);
  }

  const num = parseInt(parts[2]);
  const hex = num.toString(16).padStart(40, '0');
  return '0x' + hex;
}

async function main() {
  console.log('🧪 TESTING getLoanDetails() via Mirror Node');
  console.log('=' .repeat(70));
  console.log();

  // Load configuration
  const contractsEnv = loadEnv(path.join(__dirname, 'contracts', '.env'));

  const lendingPoolId = '0.0.7138337';
  const operatorAccountId = contractsEnv.HEDERA_ACCOUNT_ID;

  console.log('📋 Configuration:');
  console.log(`   Lending Pool ID: ${lendingPoolId}`);
  console.log(`   Test Account: ${operatorAccountId}`);
  console.log();

  // Prompt for user account to check
  console.log('👤 Enter the Hedera Account ID to check loan for:');
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
  console.log('🔍 Testing loan details for: ' + userAccountId);
  console.log();

  try {
    // Convert user account ID to EVM address
    const userEvmAddress = hederaIdToEvmAddress(userAccountId);
    console.log('✅ Step 1: Convert account to EVM address');
    console.log(`   User Account ID: ${userAccountId}`);
    console.log(`   User EVM Address: ${userEvmAddress}`);
    console.log();

    // Build mirror node URL
    const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${lendingPoolId}/call`;
    console.log('✅ Step 2: Build mirror node URL');
    console.log(`   URL: ${mirrorNodeUrl}`);
    console.log();

    // Encode function call
    const functionSelector = '0xa92cb501'; // getLoanDetails(address) selector
    const addressParam = userEvmAddress.replace('0x', '').padStart(64, '0');
    const callData = functionSelector + addressParam;

    console.log('✅ Step 3: Encode function call');
    console.log(`   Function: getLoanDetails(address)`);
    console.log(`   Selector: ${functionSelector}`);
    console.log(`   Address Param: ${addressParam}`);
    console.log(`   Call Data: ${callData}`);
    console.log();

    // Call mirror node
    console.log('🔄 Step 4: Calling mirror node...');
    const response = await fetch(mirrorNodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: callData,
        estimate: false,
      }),
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('   ❌ Error Response:', errorText);
      throw new Error(`Mirror node call failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('   ✅ Response received!');
    console.log();

    console.log('📦 Step 5: Raw response:');
    console.log(JSON.stringify(result, null, 2));
    console.log();

    // Decode the result
    if (result.result && result.result !== '0x') {
      console.log('✅ Step 6: Decoding result...');
      const resultData = result.result.replace('0x', '');

      console.log(`   Result data length: ${resultData.length} hex chars (${resultData.length / 2} bytes)`);
      console.log(`   Expected: 384 hex chars (192 bytes for 6 uint256 values)`);
      console.log();

      // Each uint256 is 32 bytes (64 hex chars)
      const collateralAmount = BigInt('0x' + resultData.substring(0, 64)).toString();
      const collateralToken = '0x' + resultData.substring(64 + 24, 128);
      const borrowedAmount = BigInt('0x' + resultData.substring(128, 192)).toString();
      const totalDebt = BigInt('0x' + resultData.substring(192, 256)).toString();
      const healthFactor = BigInt('0x' + resultData.substring(256, 320)).toString();
      const maxBorrow = BigInt('0x' + resultData.substring(320, 384)).toString();

      console.log('✅ Step 7: Decoded loan details:');
      console.log('   ┌─────────────────────────────────────────────────┐');
      console.log(`   │ Collateral Amount: ${collateralAmount.padEnd(28)} │`);
      console.log(`   │ Collateral Token:  ${collateralToken.padEnd(28)} │`);
      console.log(`   │ Borrowed Amount:   ${borrowedAmount.padEnd(28)} │`);
      console.log(`   │   (₦${(parseFloat(borrowedAmount) / 100).toLocaleString().padEnd(25)})│`);
      console.log(`   │ Total Debt:        ${totalDebt.padEnd(28)} │`);
      console.log(`   │   (₦${(parseFloat(totalDebt) / 100).toLocaleString().padEnd(25)})│`);
      console.log(`   │ Health Factor:     ${healthFactor}%${('').padEnd(27 - healthFactor.length)} │`);
      console.log(`   │ Max Borrow:        ${maxBorrow.padEnd(28)} │`);
      console.log(`   │   (₦${(parseFloat(maxBorrow) / 100).toLocaleString().padEnd(25)})│`);
      console.log('   └─────────────────────────────────────────────────┘');
      console.log();

      // Analysis
      console.log('📊 Analysis:');
      if (parseFloat(borrowedAmount) > 0) {
        console.log('   ✅ USER HAS AN ACTIVE LOAN!');
        console.log(`   💰 Borrowed: ₦${(parseFloat(borrowedAmount) / 100).toLocaleString()}`);
        console.log(`   📈 Total Debt: ₦${(parseFloat(totalDebt) / 100).toLocaleString()}`);
        console.log(`   💚 Health Factor: ${healthFactor}%`);

        const healthNum = parseFloat(healthFactor);
        if (healthNum >= 150) {
          console.log('   🟢 Status: HEALTHY');
        } else if (healthNum >= 120) {
          console.log('   🟡 Status: WARNING - Watch your health factor!');
        } else {
          console.log('   🔴 Status: AT RISK - Liquidation possible!');
        }
      } else {
        console.log('   ℹ️  No active loan found for this account');
      }
      console.log();

    } else {
      console.log('⚠️  Step 6: No data returned');
      console.log('   This means the user has no loan, or there was an issue.');
      console.log();
    }

    console.log('=' .repeat(70));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(70));
    console.log();
    console.log('💡 Next steps:');
    console.log('   • Check your frontend console logs');
    console.log('   • Make sure mirror node URL is correct');
    console.log('   • Verify the dashboard displays this data');
    console.log();

  } catch (error) {
    console.error('=' .repeat(70));
    console.error('❌ TEST FAILED');
    console.error('=' .repeat(70));
    console.error();
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    console.error();
    console.error('💡 Troubleshooting:');
    console.error('   • Check internet connection');
    console.error('   • Verify lending pool ID is correct');
    console.error('   • Check if mirror node is accessible');
    console.error('   • Verify function selector matches contract');
    console.error();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
