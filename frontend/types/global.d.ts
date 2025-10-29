declare global {
    interface Window {
      hashpack?: any; // HashPack injects this
      ethereum?: any; // EVM provider injected by browser wallets
    }
  }
  
  export {};
  