'use client';

import { CONFIG } from '@/constants';
import useHashConnect from './useHashConnect';
import {
  executeContractFunction as hashConnectExecuteContract,
  approveToken
} from '@/services/hashConnect';

// Helper function: Convert Hedera ID to EVM address (Solidity format)
function hederaIdToEvmAddress(hederaId: string): string {
  // Parse Hedera ID format: 0.0.12345
  const parts = hederaId.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid Hedera ID format: ${hederaId}`);
  }

  const num = parseInt(parts[2]);
  // Convert to hex and pad to 40 characters (20 bytes)
  const hex = num.toString(16).padStart(40, '0');
  return '0x' + hex;
}

// Helper function: Convert EVM address to Hedera ID
// Only works for Hedera long-form addresses (0x00000...xxxxx)
// Cannot convert full 20-byte EVM addresses
function evmAddressToHederaId(address: string): string {
  // Remove 0x prefix if present
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;

  // Check if this is a long-form Hedera address (most significant bytes are zero)
  // Long-form: 0x0000000000000000000000000000000000003039 = 0.0.12345
  // Full EVM:  0x4aa74485F96993438Cf73Bc56d603317ab22Db32 = cannot convert

  // A long-form Hedera address will have at least 32 leading zeros (16 bytes of zeros)
  const leadingZeros = cleanAddress.match(/^0+/)?.[0].length || 0;

  if (leadingZeros < 32) {
    // This is a full EVM address, not a Hedera long-form address
    // We cannot convert this - the user needs to provide the Hedera ID manually
    throw new Error(
      `Cannot convert full EVM address to Hedera ID: ${address}\n` +
      `This appears to be a native EVM contract address.\n` +
      `Please provide the contract's Hedera ID (0.0.xxxxx format) in your config.`
    );
  }

  // Extract the rightmost hex digits (after the zeros)
  const significantPart = cleanAddress.replace(/^0+/, '');

  // Use BigInt to handle large numbers without scientific notation
  try {
    const num = BigInt('0x' + significantPart);
    return `0.0.${num.toString()}`;
  } catch (error) {
    throw new Error(`Failed to convert address to Hedera ID: ${address}`);
  }
}

export function useContract() {
  const { accountId, isConnected } = useHashConnect();


  // Get token balance - Note: This is a read-only operation, doesn't need signing
  const getTokenBalance = async (tokenAddress: string, userAddress: string) => {
    try {
      console.log('⚠️ Token balance check not yet implemented with HashConnect');
      console.log('This would require calling a smart contract view function');
      // For now, return a placeholder or skip the balance check
      return '1000000'; // Placeholder balance
    } catch (error: any) {
      console.error('Get balance error:', error);
      return '0';
    }
  };

  // Deposit collateral with property tracking using HashConnect
  const depositCollateral = async (
    tokenAddress: string,
    amount: string,
    propertyId: string,
    propertyValue: string
  ) => {
    try {
      if (!isConnected || !accountId) {
        throw new Error('Please connect your wallet first');
      }

      console.log('🔷 Starting deposit with HashConnect...');
      console.log('Token Address (input):', tokenAddress);
      console.log('Amount:', amount);
      console.log('Property ID:', propertyId);
      console.log('Property Value:', propertyValue);
      console.log('Account ID:', accountId);

      // Validate amount
      const amountNum = parseInt(amount, 10);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }
      console.log('Amount (numeric):', amountNum);

      // Convert to EVM address format if it's a Hedera ID
      // Solidity contracts expect EVM addresses (0x...)
      const evmTokenAddress = tokenAddress.startsWith('0.0.')
        ? hederaIdToEvmAddress(tokenAddress)
        : tokenAddress;

      console.log('Token Address (EVM format):', evmTokenAddress);

      // Use the Hedera ID if available, otherwise try to convert
      let lendingPoolId: string;

      if ('LENDING_POOL_ID' in CONFIG && CONFIG.LENDING_POOL_ID !== '0.0.XXXXXX') {
        lendingPoolId = (CONFIG as any).LENDING_POOL_ID;
        console.log('Using configured Hedera ID:', lendingPoolId);
      } else if (CONFIG.LENDING_POOL_ADDRESS.startsWith('0x')) {
        console.log('Attempting to convert EVM address to Hedera ID...');
        try {
          lendingPoolId = evmAddressToHederaId(CONFIG.LENDING_POOL_ADDRESS);
          console.log('Converted to Hedera ID:', lendingPoolId);
        } catch (error: any) {
          console.error('Conversion failed:', error.message);
          throw new Error(
            'Cannot use this contract with HashConnect.\n\n' +
            'Your LENDING_POOL_ADDRESS is a full EVM address that cannot be automatically converted.\n' +
            'Please add LENDING_POOL_ID with the Hedera ID (0.0.xxxxx format) to your constants.\n\n' +
            'You can find this ID from your contract deployment transaction or in HashScan.'
          );
        }
      } else {
        lendingPoolId = CONFIG.LENDING_POOL_ADDRESS;
      }

      console.log('Lending Pool ID (Hedera format):', lendingPoolId);

      // Step 1: Approve the lending pool to spend tokens
      // We need to convert the token address back to Hedera ID format for approval
      let tokenHederaId: string;
      if (tokenAddress.startsWith('0.0.')) {
        tokenHederaId = tokenAddress;
      } else if (tokenAddress.startsWith('0x')) {
        // Token is in EVM format, convert it to Hedera ID
        console.log('⚠️ Token address is in EVM format, converting to Hedera ID...');
        try {
          tokenHederaId = evmAddressToHederaId(tokenAddress);
          console.log('✅ Converted to Hedera ID:', tokenHederaId);
        } catch (conversionError: any) {
          console.error('❌ Failed to convert token address:', conversionError);
          throw new Error(
            'Unable to convert token address to Hedera ID.\n' +
            'The token address format is not compatible with conversion.\n' +
            'Please ensure the property token was created properly.'
          );
        }
      } else {
        throw new Error('Invalid token address format');
      }

      console.log('🔷 Step 1: Approving token spend...');
      console.log('Token Hedera ID:', tokenHederaId);
      console.log('Lending Pool ID:', lendingPoolId);
      console.log('Amount to approve:', amount);

      try {
        const approvalResult = await approveToken(
          accountId,
          tokenHederaId,
          lendingPoolId,
          amount
        );
        console.log('✅ Token approval successful!', approvalResult);
      } catch (approvalError: any) {
        console.error('❌ Token approval failed:', approvalError);
        throw new Error(`Token approval failed: ${approvalError.message}`);
      }

      // Step 2: Deposit the collateral
      console.log('🔷 Step 2: Executing deposit contract call via HashConnect...');

      // Use HashConnect to execute the contract function
      const result = await hashConnectExecuteContract(
        accountId,
        lendingPoolId,
        'depositCollateral',
        {
          tokenAddress: evmTokenAddress,
          amount: amount,
          propertyId: propertyId,
          propertyValue: propertyValue
        },
        500000 // gas limit
      );

      console.log('✅ Deposit successful!', result);

      return {
        success: true,
        txHash: result.transactionId || 'Transaction completed'
      };
    } catch (error: any) {
      console.error('❌ Deposit error:', error);

      if (error.message.includes('User cancelled') || error.message.includes('user rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message.includes('insufficient')) {
        throw new Error('Insufficient HBAR for gas fees or insufficient token balance');
      } else {
        throw new Error(error.message || 'Failed to deposit collateral');
      }
    }
  };

  // Borrow heNGN using HashConnect
  const borrow = async (amount: string) => {
    try {
      if (!isConnected || !accountId) {
        throw new Error('Please connect your wallet first');
      }

      console.log('🔷 Starting borrow with HashConnect...');
      console.log('Amount:', amount);
      console.log('Account ID:', accountId);

      // Use the Hedera ID if available, otherwise try to convert
      let lendingPoolId: string;
      if ('LENDING_POOL_ID' in CONFIG && CONFIG.LENDING_POOL_ID !== '0.0.XXXXXX') {
        lendingPoolId = (CONFIG as any).LENDING_POOL_ID;
      } else if (CONFIG.LENDING_POOL_ADDRESS.startsWith('0x')) {
        try {
          lendingPoolId = evmAddressToHederaId(CONFIG.LENDING_POOL_ADDRESS);
        } catch (error: any) {
          throw new Error('Please add LENDING_POOL_ID to your constants. See console for details.');
        }
      } else {
        lendingPoolId = CONFIG.LENDING_POOL_ADDRESS;
      }

      console.log('🔷 Executing borrow via HashConnect...');

      // Use HashConnect to execute the contract function
      const result = await hashConnectExecuteContract(
        accountId,
        lendingPoolId,
        'borrow',
        {
          amount: amount
        },
        500000 // gas limit
      );

      console.log('✅ Borrow successful!', result);

      return {
        success: true,
        txHash: result.transactionId || 'Transaction completed'
      };
    } catch (error: any) {
      console.error('❌ Borrow error:', error);
      throw new Error(error.message || 'Failed to borrow');
    }
  };

  // Repay loan using HashConnect
  const repay = async (amount: string) => {
    try {
      if (!isConnected || !accountId) {
        throw new Error('Please connect your wallet first');
      }

      console.log('🔷 Starting repay with HashConnect...');
      console.log('Amount:', amount);
      console.log('Account ID:', accountId);

      // Use the Hedera ID if available, otherwise try to convert
      let lendingPoolId: string;
      if ('LENDING_POOL_ID' in CONFIG && CONFIG.LENDING_POOL_ID !== '0.0.XXXXXX') {
        lendingPoolId = (CONFIG as any).LENDING_POOL_ID;
      } else if (CONFIG.LENDING_POOL_ADDRESS.startsWith('0x')) {
        try {
          lendingPoolId = evmAddressToHederaId(CONFIG.LENDING_POOL_ADDRESS);
        } catch (error: any) {
          throw new Error('Please add LENDING_POOL_ID to your constants. See console for details.');
        }
      } else {
        lendingPoolId = CONFIG.LENDING_POOL_ADDRESS;
      }

      console.log('🔷 Executing repay via HashConnect...');

      // Use HashConnect to execute the contract function
      const result = await hashConnectExecuteContract(
        accountId,
        lendingPoolId,
        'repay',
        {
          amount: amount
        },
        500000 // gas limit
      );

      console.log('✅ Repay successful!', result);

      return {
        success: true,
        txHash: result.transactionId || 'Transaction completed'
      };
    } catch (error: any) {
      console.error('❌ Repay error:', error);
      throw new Error(error.message || 'Failed to repay');
    }
  };

  // Get loan details - Query contract view function via Hedera JSON-RPC
  const getLoanDetails = async (userAddress: string) => {
    try {
      console.log('🔍 Fetching loan details for:', userAddress);

      // CRITICAL FIX: Get the user's actual EVM alias address from Hedera mirror node
      // The simple numeric conversion doesn't match what msg.sender sees in the contract!
      let userEvmAddress: string;

      if (userAddress.startsWith('0.0.')) {
        console.log('🔍 Fetching EVM alias from mirror node...');
        try {
          const mirrorResponse = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${userAddress}`);
          const mirrorData = await mirrorResponse.json();

          if (mirrorData.evm_address) {
            userEvmAddress = mirrorData.evm_address;
            console.log('✅ Found EVM alias from mirror node:', userEvmAddress);
          } else {
            // Fallback to numeric conversion if no alias exists
            userEvmAddress = hederaIdToEvmAddress(userAddress);
            console.log('⚠️ No EVM alias found, using numeric conversion:', userEvmAddress);
          }
        } catch (mirrorError) {
          console.error('❌ Failed to fetch from mirror node:', mirrorError);
          userEvmAddress = hederaIdToEvmAddress(userAddress);
          console.log('⚠️ Fallback to numeric conversion:', userEvmAddress);
        }
      } else {
        userEvmAddress = userAddress;
      }

      console.log('User EVM Address for query:', userEvmAddress);

      // Encode the function call: getLoanDetails(address)
      const functionSelector = '0xe8a7da8e'; // keccak256("getLoanDetails(address)") first 4 bytes
      const paddedAddress = userEvmAddress.slice(2).padStart(64, '0');
      const data = functionSelector + paddedAddress;

      console.log('Calling contract at:', CONFIG.LENDING_POOL_ADDRESS);

      // Use Hedera JSON-RPC to call the contract
      const rpcUrl = 'https://testnet.hashio.io/api';
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: CONFIG.LENDING_POOL_ADDRESS, data: data }, 'latest'],
          id: 1,
        }),
      });

      const result = await response.json();

      if (result.error) {
        console.error('RPC Error:', result.error);
        throw new Error(result.error.message || 'Failed to query contract');
      }

      if (!result.result || result.result === '0x') {
        console.log('No active loan found');
        return {
          collateralAmount: '0',
          collateralToken: '0x0000000000000000000000000000000000000000',
          borrowedAmount: '0',
          totalDebt: '0',
          healthFactor: '0',
          maxBorrow: '0',
        };
      }

      // Decode the result: (uint256, address, uint256, uint256, uint256, uint256)
      const resultData = result.result.slice(2);
      const collateralAmount = BigInt('0x' + resultData.slice(0, 64)).toString();
      const collateralToken = '0x' + resultData.slice(64 + 24, 128);
      const borrowedAmount = BigInt('0x' + resultData.slice(128, 192)).toString();
      const totalDebt = BigInt('0x' + resultData.slice(192, 256)).toString();
      const healthFactor = BigInt('0x' + resultData.slice(256, 320)).toString();
      const maxBorrow = BigInt('0x' + resultData.slice(320, 384)).toString();

      console.log('✅ Loan details:', { collateralAmount, borrowedAmount, totalDebt, healthFactor, maxBorrow });

      return {
        collateralAmount,
        collateralToken,
        borrowedAmount,
        totalDebt,
        healthFactor,
        maxBorrow,
      };
    } catch (error: any) {
      console.error('❌ Get loan details error:', error);
      return {
        collateralAmount: '0',
        collateralToken: '0x0000000000000000000000000000000000000000',
        borrowedAmount: '0',
        totalDebt: '0',
        healthFactor: '0',
        maxBorrow: '0',
      };
    }
  };

  // Add supported token (admin function) using HashConnect
  const addSupportedToken = async (tokenAddress: string) => {
    try {
      if (!isConnected || !accountId) {
        throw new Error('Please connect your wallet first');
      }

      console.log('🔷 Adding supported token with HashConnect...');
      console.log('Token Address (input):', tokenAddress);
      console.log('Account ID:', accountId);

      // Convert to EVM address format if it's a Hedera ID
      const evmTokenAddress = tokenAddress.startsWith('0.0.')
        ? hederaIdToEvmAddress(tokenAddress)
        : tokenAddress;

      console.log('Token Address (EVM format):', evmTokenAddress);

      // Get lending pool ID
      let lendingPoolId: string;
      if ('LENDING_POOL_ID' in CONFIG && CONFIG.LENDING_POOL_ID !== '0.0.XXXXXX') {
        lendingPoolId = (CONFIG as any).LENDING_POOL_ID;
      } else if (CONFIG.LENDING_POOL_ADDRESS.startsWith('0x')) {
        try {
          lendingPoolId = evmAddressToHederaId(CONFIG.LENDING_POOL_ADDRESS);
        } catch (error: any) {
          throw new Error('Please add LENDING_POOL_ID to your constants.');
        }
      } else {
        lendingPoolId = CONFIG.LENDING_POOL_ADDRESS;
      }

      console.log('Lending Pool ID:', lendingPoolId);

      // Execute the addSupportedToken function
      const result = await hashConnectExecuteContract(
        accountId,
        lendingPoolId,
        'addSupportedToken',
        {
          token: evmTokenAddress
        },
        100000 // gas limit
      );

      console.log('✅ Token added successfully!', result);

      return {
        success: true,
        txHash: result.transactionId || 'Transaction completed'
      };
    } catch (error: any) {
      console.error('❌ Add supported token error:', error);

      if (error.message.includes('User cancelled') || error.message.includes('user rejected')) {
        throw new Error('Transaction cancelled by user');
      } else {
        throw new Error(error.message || 'Failed to add supported token');
      }
    }
  };

  return {
    depositCollateral,
    borrow,
    repay,
    getLoanDetails,
    getTokenBalance,
    addSupportedToken,
  };
}