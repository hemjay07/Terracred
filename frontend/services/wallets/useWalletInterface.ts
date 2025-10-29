import { useContext } from "react";
import { WalletConnectContext } from "@/contexts/WalletConnectContext";
import { hashPackWallet } from "./hashpackClient";

// Purpose: This hook provides easy access to the wallet interface and account info
// Example: const { accountId, walletInterface } = useWalletInterface();
// Returns: { accountId: string | null, walletInterface: WalletInterface | null }

export const useWalletInterface = () => {
  const walletConnectCtx = useContext(WalletConnectContext);

  if (walletConnectCtx.accountId && walletConnectCtx.isConnected) {
    return {
      accountId: walletConnectCtx.accountId,
      walletInterface: hashPackWallet,
    };
  }

  return {
    accountId: null,
    walletInterface: null,
  };
};
