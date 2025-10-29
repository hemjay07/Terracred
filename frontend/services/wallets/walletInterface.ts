import { AccountId, ContractId, TokenId, TransactionId } from "@hashgraph/sdk";

// Purpose: Defines the interface for all wallet implementations
export interface WalletInterface {
  transferHBAR(toAddress: AccountId, amount: number): Promise<TransactionId | null>;
  transferFungibleToken(toAddress: AccountId, tokenId: TokenId, amount: number): Promise<TransactionId | null>;
  associateToken(tokenId: TokenId): Promise<TransactionId | null>;
  executeContractFunction(contractId: ContractId, functionName: string, functionParameters: any, gasLimit: number): Promise<TransactionId | null>;
  disconnect(): void;
}
