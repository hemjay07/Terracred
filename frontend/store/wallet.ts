'use client';

import { create } from 'zustand';

interface WalletState {
  isConnected: boolean;
  hederaAccountId: string | null;
  connect: (accountId: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  isConnected: false,
  hederaAccountId: null,

  connect: (accountId: string) =>
    set({
      isConnected: true,
      hederaAccountId: accountId,
    }),

  disconnect: () =>
    set({
      isConnected: false,
      hederaAccountId: null,
    }),
}));
