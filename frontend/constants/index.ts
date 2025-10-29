export const CONFIG = {
  // Backend API
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  
  // Hedera Network
  HEDERA_NETWORK: 'testnet',
  HEDERA_RPC_URL: 'https://testnet.hashio.io/api',
  
  // Smart Contracts (UPDATED)
  LENDING_POOL_ADDRESS: '0x4aa74485F96993438Cf73Bc56d603317ab22Db32',
  ORACLE_ADDRESS: '0x4ba81633b781097af6eC44b256735c088d9d888C',
  
  // Tokens (UPDATED)
  HENGN_TOKEN_ADDRESS: '0x00000000000000000000000000000000006c832c',
  MASTER_RWA_TOKEN_ID: '0.0.7119378',
  MASTER_RWA_TOKEN_ADDRESS: '0x00000000000000000000000000000000006ca212',
  
  // Loan Parameters
  MAX_LTV: 66.67,
  LIQUIDATION_THRESHOLD: 120,
  INTEREST_RATE: 5,
  
  // Currency
  CURRENCY: 'NGN',
  CURRENCY_SYMBOL: '₦',
} as const;

export const PROPERTY_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;