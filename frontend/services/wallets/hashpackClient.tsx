'use client';

import { useCallback, useContext, useEffect } from 'react';
import { WalletInterface } from "./walletInterface";
import {
  AccountId,
  ContractExecuteTransaction,
  ContractId,
  LedgerId,
  TokenAssociateTransaction,
  TokenId,
  TransferTransaction,
} from "@hashgraph/sdk";
import { ContractFunctionParameterBuilder } from "./contractFunctionParameterBuilder";
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId
} from "@hashgraph/hedera-wallet-connect";
import EventEmitter from "events";
import { WalletConnectContext } from "@/contexts/WalletConnectContext";

// Created refreshEvent because dappConnector event listeners need manual sync
const refreshEvent = new EventEmitter();

// WalletConnect Project ID - Create yours at https://cloud.walletconnect.com
const walletConnectProjectId = "377d75bb6f86a2ffd427d032ff6ea7d3";
const hederaNetwork = "testnet";

// Metadata for your dApp
const metadata = {
  name: "TerraCred",
  description: "Borrow against tokenized real estate on Hedera",
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: [typeof window !== 'undefined' ? window.location.origin + "/favicon.ico" : ''],
};

// Initialize DAppConnector (singleton pattern)
let dappConnector: DAppConnector | null = null;

const getDAppConnector = () => {
  if (!dappConnector && typeof window !== 'undefined') {
    dappConnector = new DAppConnector(
      metadata,
      LedgerId.fromString(hederaNetwork),
      walletConnectProjectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [HederaChainId.Testnet],
    );
  }
  return dappConnector;
};

// Ensure WalletConnect is initialized only once
let walletConnectInitPromise: Promise<void> | undefined = undefined;
const initializeWalletConnect = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Cannot initialize WalletConnect on server side');
  }

  if (walletConnectInitPromise === undefined) {
    const connector = getDAppConnector();
    if (!connector) {
      throw new Error('Failed to create DAppConnector');
    }
    walletConnectInitPromise = connector.init().catch((error) => {
      // Reset promise on error so it can be retried
      walletConnectInitPromise = undefined;
      throw error;
    });
  }

  await walletConnectInitPromise;
};

// Open HashPack connection modal
export const openHashPackModal = async () => {
  await initializeWalletConnect();
  const connector = getDAppConnector();
  if (!connector) {
    throw new Error('WalletConnect connector not available');
  }
  await connector.openModal();
  refreshEvent.emit("sync");
};

// HashPack Wallet Implementation using DAppConnector
class HashPackWallet implements WalletInterface {
  private getSigner() {
    const connector = getDAppConnector();
    if (!connector || connector.signers.length === 0) {
      throw new Error('No HashPack signers found! Please connect your wallet.');
    }
    return connector.signers[0];
  }

  private getAccountId() {
    return AccountId.fromString(this.getSigner().getAccountId().toString());
  }

  async transferHBAR(toAddress: AccountId, amount: number) {
    const transferHBARTransaction = new TransferTransaction()
      .addHbarTransfer(this.getAccountId(), -amount)
      .addHbarTransfer(toAddress, amount);

    const signer = this.getSigner();
    await transferHBARTransaction.freezeWithSigner(signer);
    const txResult = await transferHBARTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  async transferFungibleToken(toAddress: AccountId, tokenId: TokenId, amount: number) {
    const transferTokenTransaction = new TransferTransaction()
      .addTokenTransfer(tokenId, this.getAccountId(), -amount)
      .addTokenTransfer(tokenId, toAddress.toString(), amount);

    const signer = this.getSigner();
    await transferTokenTransaction.freezeWithSigner(signer);
    const txResult = await transferTokenTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  async associateToken(tokenId: TokenId) {
    const associateTokenTransaction = new TokenAssociateTransaction()
      .setAccountId(this.getAccountId())
      .setTokenIds([tokenId]);

    const signer = this.getSigner();
    await associateTokenTransaction.freezeWithSigner(signer);
    const txResult = await associateTokenTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  async executeContractFunction(
    contractId: ContractId,
    functionName: string,
    functionParameters: ContractFunctionParameterBuilder,
    gasLimit: number
  ) {
    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(gasLimit)
      .setFunction(functionName, functionParameters.buildHAPIParams());

    const signer = this.getSigner();
    await tx.freezeWithSigner(signer);
    const txResult = await tx.executeWithSigner(signer);

    return txResult ? txResult.transactionId : null;
  }

  disconnect() {
    const connector = getDAppConnector();
    if (connector) {
      connector.disconnectAll().then(() => {
        refreshEvent.emit("sync");
      });
    }
  }
}

export const hashPackWallet = new HashPackWallet();

// React component that syncs HashPack connection state with context
export const HashPackClient = () => {
  const { setAccountId, setIsConnected } = useContext(WalletConnectContext);

  const syncWithHashPackContext = useCallback(() => {
    const connector = getDAppConnector();
    if (connector && connector.signers.length > 0) {
      const accountId = connector.signers[0]?.getAccountId()?.toString();
      if (accountId) {
        setAccountId(accountId);
        setIsConnected(true);
        console.log('✅ HashPack connected:', accountId);
      } else {
        setAccountId('');
        setIsConnected(false);
      }
    } else {
      setAccountId('');
      setIsConnected(false);
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Sync after WalletConnect finishes initializing
    refreshEvent.addListener("sync", syncWithHashPackContext);

    initializeWalletConnect()
      .then(() => {
        syncWithHashPackContext();
      })
      .catch((error) => {
        console.error('Failed to initialize WalletConnect:', error);
      });

    return () => {
      refreshEvent.removeListener("sync", syncWithHashPackContext);
    };
  }, [syncWithHashPackContext]);

  return null;
};
