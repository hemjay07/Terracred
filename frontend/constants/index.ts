export const CONFIG = {
  // Backend API
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  
  // Hedera Network
  HEDERA_NETWORK: 'testnet',
  HEDERA_RPC_URL: 'https://testnet.hashio.io/api',
  
  // Smart Contracts (UPDATED)
  // NOTE: For HashConnect transactions, you need the Hedera ID format (0.0.xxxxx)
  LENDING_POOL_ADDRESS: '0x4aa74485F96993438Cf73Bc56d603317ab22Db32',
  LENDING_POOL_ID: '0.0.7138337', // Hedera ID for lending pool contract
  ORACLE_ADDRESS: '0x4ba81633b781097af6eC44b256735c088d9d888C',
  ORACLE_ID: '0.0.7138336', // Hedera ID for oracle contract
  
  // Tokens (UPDATED - v2 No KYC)
  HENGN_TOKEN_ADDRESS: '0x00000000000000000000000000000000006c832c',
  MASTER_RWA_TOKEN_ID: '0.0.7162666',
  MASTER_RWA_TOKEN_ADDRESS: '0x00000000000000000000000000000000006d4b2a',
  
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