export interface Property {
  propertyId: string;
  owner: string;
  address: string;
  value: number;
  description: string;
  status: 'pending' | 'verified' | 'rejected';
  tokenId?: string | null;
  tokenAddress?: string | null;
  tokenSupply: number;
  verifiedAt?: string | null;
  createdAt: string;
}

// User Types
export interface User {
  userId: string;
  accountId: string;
  email?: string;
  name?: string;
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

// Loan Types
export interface Loan {
  collateralAmount: string;
  collateralToken: string;
  borrowedAmount: string;
  totalDebt: string;
  healthFactor: string;
  maxBorrow: string;
}

// Wallet State
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  hederaAccountId: string | null;
}
