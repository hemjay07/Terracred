'use client';

import { useState } from 'react';
import useHashConnect from '@/hooks/useHashConnect';
import { useContract } from '@/hooks/useContract';
import { CONFIG } from '@/constants';

export default function AdminPage() {
  const { isConnected, accountId } = useHashConnect();
  const { addSupportedToken } = useContract();

  const [tokenAddress, setTokenAddress] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ownershipCheck, setOwnershipCheck] = useState<string | null>(null);

  const handleAddSupportedToken = async () => {
    if (!tokenAddress.trim()) {
      setResult({ success: false, message: 'Please enter a token address' });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const tx = await addSupportedToken(tokenAddress);
      setResult({
        success: true,
        message: `Token added successfully!\nTransaction: ${tx.txHash}`
      });
      setTokenAddress('');
    } catch (error: any) {
      let errorMessage = error.message;

      // Provide helpful context for common errors
      if (error.message.includes('CONTRACT_REVERT_EXECUTED')) {
        errorMessage =
          '❌ Transaction Reverted\n\n' +
          'Most likely cause: You are not the contract owner.\n\n' +
          'The contract owner is the account that deployed the LendingPool contract. ' +
          'Check HashScan to verify the owner address and make sure you are connected with that account.\n\n' +
          'Other possible causes:\n' +
          '• Token address is invalid (0x0...0)\n' +
          '• Token is already whitelisted\n\n' +
          'Original error: ' + error.message;
      }

      setResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddMasterToken = async () => {
    setTokenAddress(CONFIG.MASTER_RWA_TOKEN_ADDRESS);
    // Automatically trigger the add
    setTimeout(() => {
      document.getElementById('add-token-button')?.click();
    }, 100);
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
          <p className="text-gray-600 mb-4">Please connect your wallet to access admin functions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold">Lending Pool Admin</h1>
          <p className="text-sm text-gray-600 mt-1">
            Connected as: <span className="font-mono">{accountId}</span>
          </p>
        </div>

        {/* Contract Info */}
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
          <h2 className="font-semibold mb-2">Contract Information</h2>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-600">Lending Pool ID:</span>{' '}
              <span className="font-mono">{CONFIG.LENDING_POOL_ID}</span>
            </p>
            <p>
              <span className="text-gray-600">Network:</span> {CONFIG.HEDERA_NETWORK}
            </p>
          </div>
        </div>

        {/* Add Supported Token */}
        <div className="px-6 py-6">
          <h2 className="text-lg font-semibold mb-4">Add Supported Token</h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              ⚠️ Owner Only Function
            </p>
            <p className="text-sm text-yellow-700 mb-2">
              Only the contract owner can add supported tokens. The owner is the account that deployed the contract.
            </p>
            <div className="bg-white rounded p-3 mt-2">
              <p className="text-xs text-gray-600 mb-1">Your connected account:</p>
              <p className="text-xs font-mono text-gray-900">{accountId}</p>
              <p className="text-xs text-gray-600 mt-2 mb-1">To check the contract owner:</p>
              <a
                href={`https://hashscan.io/testnet/contract/${CONFIG.LENDING_POOL_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View contract on HashScan →
              </a>
              <p className="text-xs text-gray-500 mt-1">Look for the "owner" field in the contract state</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Quick Add Master Token */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-semibold mb-2">Quick Action</p>
              <p className="text-sm text-blue-700 mb-3">
                Add the master RWA token ({CONFIG.MASTER_RWA_TOKEN_ID}):
              </p>
              <button
                onClick={handleAddMasterToken}
                disabled={processing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {processing ? 'Processing...' : 'Add Master RWA Token'}
              </button>
            </div>

            {/* Manual Token Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Address (EVM format or Hedera ID)
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x... or 0.0.xxxxx"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: {CONFIG.MASTER_RWA_TOKEN_ADDRESS} or {CONFIG.MASTER_RWA_TOKEN_ID}
              </p>
            </div>

            <button
              id="add-token-button"
              onClick={handleAddSupportedToken}
              disabled={processing || !tokenAddress.trim()}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {processing ? 'Processing Transaction...' : 'Add Supported Token'}
            </button>
          </div>

          {/* Result Message */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm whitespace-pre-line ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {result.success ? '✅ ' : '❌ '}
                {result.message}
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Connect your wallet with the contract owner account</li>
            <li>Enter the token address you want to whitelist</li>
            <li>Click "Add Supported Token" and approve the transaction</li>
            <li>Wait for confirmation</li>
          </ol>
        </div>

        {/* What to do if not owner */}
        <div className="border-t border-gray-200 px-6 py-4 bg-red-50">
          <h3 className="font-semibold mb-2 text-red-900">If you get a CONTRACT_REVERT error:</h3>
          <div className="text-sm text-red-800 space-y-2">
            <p>This means you're not the contract owner. You have 3 options:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                <strong>Connect with the deployer account:</strong> The owner is whoever deployed the contract.
                Disconnect your current wallet and connect with the deployment account.
              </li>
              <li>
                <strong>Transfer ownership:</strong> Have the current owner call <code className="bg-red-100 px-1 rounded">transferOwnership(newOwner)</code> to transfer to your account.
              </li>
              <li>
                <strong>Redeploy the contract:</strong> Deploy a new contract with the master RWA token pre-whitelisted in the constructor (recommended for production).
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
