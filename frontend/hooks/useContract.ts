'use client';

import { ethers } from 'ethers';
import { CONFIG } from '@/constants';

// HTS Precompile for Hedera native tokens
const HTS_ADDRESS = '0x0000000000000000000000000000000000000167';
const HTS_ABI = [
  "function approve(address token, address spender, uint256 amount) external returns (int64)",
  "function allowance(address token, address owner, address spender) external returns (int64, uint256)",
  "function balanceOf(address token, address account) external returns (int64, uint256)",
];

const LENDING_POOL_ABI = [
  "function depositCollateral(address token, uint256 amount, string propertyId, uint256 propertyValue) external",
  "function borrow(uint256 amount) external",
  "function repay(uint256 amount) external",
  "function withdrawCollateral(uint256 amount) external",
  "function getLoanDetails(address user) view returns (uint256 collateralAmount, address collateralToken, uint256 borrowedAmount, uint256 totalDebt, uint256 healthFactor, uint256 maxBorrow)",
  "function getHealthFactor(address user) view returns (uint256)",
  "function isLiquidatable(address user) view returns (bool)",
];

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

// Helper function: Convert Hedera ID to EVM address
function hederaIdToSolidityAddress(tokenId: string): string {
  const parts = tokenId.split('.');
  const num = parseInt(parts[2]);
  return '0x' + num.toString(16).padStart(40, '0');
}

export function useContract() {
  const getProvider = () => {
    // Use window.ethereum provided by HashPack
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet connected. Please connect HashPack.');
    }

    console.log('Using window.ethereum provider from HashPack');
    return new ethers.BrowserProvider(window.ethereum);
  };

  const getSigner = async () => {
    const provider = getProvider();
    const signer = await provider.getSigner();
    return signer;
  };


  const getLendingPoolContract = async () => {
    const signer = await getSigner();
    return new ethers.Contract(
      CONFIG.LENDING_POOL_ADDRESS,
      LENDING_POOL_ABI,
      signer
    );
  };

  const getHTSContract = async () => {
    const signer = await getSigner();
    return new ethers.Contract(HTS_ADDRESS, HTS_ABI, signer);
  };

  const getTokenContract = async (tokenAddress: string) => {
    const provider = getProvider();
    return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  };

  // Get token balance using HTS precompile for Hedera tokens
  const getTokenBalance = async (tokenAddress: string, userAddress: string) => {
    try {
      console.log('Checking balance for:', tokenAddress, 'user:', userAddress);
      
      const isHederaToken = tokenAddress.startsWith('0x000000000000000000000000');
      
      if (isHederaToken) {
        console.log('Using HTS precompile for Hedera token');
        const htsContract = await getHTSContract();
        const result = await htsContract.balanceOf(tokenAddress, userAddress);
        const balance = result[1].toString();
        console.log('HTS Balance:', balance);
        return balance;
      } else {
        console.log('Using standard ERC20 balanceOf');
        const tokenContract = await getTokenContract(tokenAddress);
        const balance = await tokenContract.balanceOf(userAddress);
        console.log('ERC20 Balance:', balance.toString());
        return balance.toString();
      }
    } catch (error: any) {
      console.error('Get balance error:', error);
      return '0';
    }
  };

  // Approve HTS token using precompile
  const approveHTS = async (tokenAddress: string, amount: string) => {
    try {
      const htsContract = await getHTSContract();
      console.log('Approving HTS token:', tokenAddress, 'for', CONFIG.LENDING_POOL_ADDRESS);
      
      const tx = await htsContract.approve(
        tokenAddress,
        CONFIG.LENDING_POOL_ADDRESS,
        amount
      );
      const receipt = await tx.wait();
      console.log('HTS approval successful:', receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error('HTS approval error:', error);
      throw new Error(`Failed to approve token: ${error.message}`);
    }
  };

  // Deposit collateral with property tracking
  const depositCollateral = async (
    tokenAddress: string, 
    amount: string,
    propertyId: string,
    propertyValue: string
  ) => {
    try {
      console.log('Starting deposit...');
      console.log('Token Address (input):', tokenAddress);
      console.log('Amount:', amount);
      console.log('Property ID:', propertyId);
      console.log('Property Value:', propertyValue);

      // Convert Hedera ID to EVM address if needed
      const evmAddress = tokenAddress.startsWith('0.0.') 
        ? hederaIdToSolidityAddress(tokenAddress)
        : tokenAddress;
      
      console.log('Token Address (EVM):', evmAddress);

      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      console.log('User Address:', userAddress);

      // Check balance using HTS precompile
      const balance = await getTokenBalance(evmAddress, userAddress);
      console.log('Token Balance:', balance);

      // Warning if low balance, but allow user to proceed
      if (BigInt(balance) < BigInt(amount)) {
        console.warn(`Warning: Balance shows ${balance} but you're trying to deposit ${amount}`);
        const proceed = confirm(`Balance check shows ${balance} tokens, but you're depositing ${amount}. This might fail. Continue anyway?`);
        if (!proceed) {
          throw new Error('User cancelled deposit');
        }
      }

      // Approve using HTS precompile with EVM address
      console.log('Approving tokens via HTS precompile...');
      await approveHTS(evmAddress, amount);

      // Deposit collateral with property info
      console.log('Depositing collateral...');
      const lendingPool = await getLendingPoolContract();
      const depositTx = await lendingPool.depositCollateral(
        evmAddress,
        amount,
        propertyId,
        propertyValue
      );
      
      console.log('Deposit TX:', depositTx.hash);
      const receipt = await depositTx.wait();
      console.log('Collateral deposited!', receipt.hash);

      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error('Deposit error:', error);
      
      if (error.message.includes('User cancelled')) {
        throw error;
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient HBAR for gas fees');
      } else if (error.message.includes('execution reverted')) {
        throw new Error('Transaction reverted. Possible reasons: Token not associated, insufficient balance, or token not supported.');
      } else {
        throw new Error(error.shortMessage || error.message || 'Failed to deposit collateral');
      }
    }
  };

  // Borrow heNGN
  const borrow = async (amount: string) => {
    try {
      const lendingPool = await getLendingPoolContract();

      console.log('Borrowing heNGN...');
      const borrowTx = await lendingPool.borrow(amount);
      const receipt = await borrowTx.wait();
      console.log('Borrowed successfully!', receipt.hash);

      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error('Borrow error:', error);
      throw new Error(error.shortMessage || error.message || 'Failed to borrow');
    }
  };

  // Repay loan
  const repay = async (amount: string) => {
    try {
      const lendingPool = await getLendingPoolContract();

      const heNGNAddress = CONFIG.HENGN_TOKEN_ADDRESS.startsWith('0.0.')
        ? hederaIdToSolidityAddress(CONFIG.HENGN_TOKEN_ADDRESS)
        : CONFIG.HENGN_TOKEN_ADDRESS;

      console.log('Approving heNGN...');
      await approveHTS(heNGNAddress, amount);

      console.log('Repaying loan...');
      const repayTx = await lendingPool.repay(amount);
      const receipt = await repayTx.wait();
      console.log('Loan repaid!', receipt.hash);

      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error('Repay error:', error);
      throw new Error(error.shortMessage || error.message || 'Failed to repay');
    }
  };

  // Get loan details
  const getLoanDetails = async (userAddress: string) => {
    try {
      const provider = getProvider();
      const lendingPool = new ethers.Contract(
        CONFIG.LENDING_POOL_ADDRESS,
        LENDING_POOL_ABI,
        provider
      );

      const details = await lendingPool.getLoanDetails(userAddress);

      return {
        collateralAmount: details[0].toString(),
        collateralToken: details[1],
        borrowedAmount: details[2].toString(),
        totalDebt: details[3].toString(),
        healthFactor: details[4].toString(),
        maxBorrow: details[5].toString(),
      };
    } catch (error: any) {
      console.error('Get loan details error:', error);
      throw error;
    }
  };

  return {
    depositCollateral,
    borrow,
    repay,
    getLoanDetails,
    getTokenBalance,
  };
}