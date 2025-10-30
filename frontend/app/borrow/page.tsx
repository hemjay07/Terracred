'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { useContract } from '@/hooks/useContract';
import { api } from '@/lib/api';
import { CONFIG } from '@/constants';
import type { Property } from '@/types';

export default function BorrowPage() {
  const { isConnected, accountId } = useHashConnect();
  const { depositCollateral, borrow, getLoanDetails } = useContract();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [step, setStep] = useState<'select' | 'deposit' | 'borrow'>('select');
  const [maxBorrowFromContract, setMaxBorrowFromContract] = useState<string>('0');
  const [loanDetails, setLoanDetails] = useState<any>(null);

  useEffect(() => {
    async function fetchProperties() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.getProperties(accountId);
        if (response.success) {
          const verified = response.properties.filter(p => p.status === 'verified');
          setProperties(verified);
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [isConnected, accountId]);

  // ⭐ REMOVED: The automatic balance check that was triggering wallet connection

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setCollateralAmount('');
    setBorrowAmount('');
    setStep('deposit');
  };

  const handleDepositCollateral = async () => {
    if (!selectedProperty || !collateralAmount || !accountId) return;

    // Warn user about the two-step process
    const confirmed = confirm(
      '⚠️ IMPORTANT: Two wallet signatures required\n\n' +
      'Step 1: Approve token spending (SIGN THIS QUICKLY!)\n' +
      'Step 2: Deposit collateral\n\n' +
      'Please keep your wallet open and sign both transactions.\n\n' +
      'Click OK to continue.'
    );

    if (!confirmed) return;

    setProcessing(true);
    try {
      setProcessingStep('Step 1/2: Requesting token approval - Check your wallet!');

      const result = await depositCollateral(
        selectedProperty.tokenAddress!,
        collateralAmount,
        selectedProperty.propertyId,
        selectedProperty.value.toString()
      );

      setProcessingStep('Fetching your loan details...');

      // Fetch loan details to get the actual maxBorrow
      const details = await getLoanDetails(accountId);
      setLoanDetails(details);
      setMaxBorrowFromContract(details.maxBorrow);

      setProcessingStep('');
      alert(`✅ Collateral deposited!\nTx: ${result.txHash}\n\nMax you can borrow: ₦${(parseFloat(details.maxBorrow) / 100).toLocaleString()}`);

      setStep('borrow');
    } catch (error: any) {
      setProcessingStep('');
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount) return;

    // Validate borrow amount
    const requestedAmountCents = parseFloat(borrowAmount) * 100;
    const maxBorrowCents = parseFloat(maxBorrowFromContract);

    if (requestedAmountCents > maxBorrowCents) {
      alert(`❌ Cannot borrow ₦${borrowAmount}\n\nMaximum you can borrow: ₦${(maxBorrowCents / 100).toLocaleString()}\n\nThis is based on your collateral value and the ${CONFIG.MAX_LTV}% LTV ratio.`);
      return;
    }

    if (requestedAmountCents <= 0) {
      alert('❌ Please enter a valid borrow amount greater than 0');
      return;
    }

    setProcessing(true);
    try {
      // heNGN has 2 decimals
      const amountCents = Math.floor(requestedAmountCents).toString();
      const result = await borrow(amountCents);

      alert(`✅ Borrowed ₦${borrowAmount} heNGN!\n\nTransaction: ${result.txHash}\n\n💡 Check your HashPack wallet for the heNGN tokens.\nIf you don't see them, you may need to associate the heNGN token first.`);
      window.location.href = '/dashboard';
    } catch (error: any) {
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const calculateMaxBorrow = () => {
    if (!selectedProperty || !collateralAmount) return 0;
    const collateralValue = parseFloat(collateralAmount) * (selectedProperty.value / selectedProperty.tokenSupply);
    return collateralValue * (CONFIG.MAX_LTV / 100);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-8">
            <p className="text-warning font-medium mb-4">⚠️ Wallet Not Connected</p>
            <Link href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
              Connect Wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-20"><div className="text-center">Loading...</div></div>;
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Borrow heNGN</h1>
        <p className="text-muted-foreground mb-8">
          Lock your property tokens as collateral and borrow Naira stablecoins.
        </p>

        {/* Steps */}
        <div className="flex items-center justify-between mb-8">
          <div className={`flex-1 text-center ${step === 'select' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'select' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>1</div>
            <p className="text-sm">Select</p>
          </div>
          <div className="flex-1 border-t border-border"></div>
          <div className={`flex-1 text-center ${step === 'deposit' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'deposit' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>2</div>
            <p className="text-sm">Deposit</p>
          </div>
          <div className="flex-1 border-t border-border"></div>
          <div className={`flex-1 text-center ${step === 'borrow' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'borrow' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>3</div>
            <p className="text-sm">Borrow</p>
          </div>
        </div>

        {/* Select Property */}
        {step === 'select' && (
          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Select Property</h2>
            {properties.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No verified properties yet.</p>
                <Link href="/tokenize" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg">
                  Tokenize Property
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map((property) => (
                  <button
                    key={property.propertyId}
                    onClick={() => handlePropertySelect(property)}
                    className="w-full p-4 bg-background border rounded-lg hover:border-primary transition text-left"
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold">{property.address}</p>
                        <p className="text-xs text-muted-foreground">{property.propertyId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">₦{(property.value / 1000000).toFixed(1)}M</p>
                        <p className="text-xs text-muted-foreground">{property.tokenSupply} tokens</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deposit Collateral */}
        {step === 'deposit' && selectedProperty && (
          <div className="bg-card border rounded-lg p-8">
            <button onClick={() => setStep('select')} className="text-sm text-muted-foreground hover:text-foreground mb-4">
              ← Change Property
            </button>
            <h2 className="text-xl font-semibold mb-4">Deposit Collateral</h2>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium">{selectedProperty.address}</p>
              <p className="text-xs text-muted-foreground">Available: {selectedProperty.tokenSupply} tokens</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Collateral Amount (tokens)</label>
              <input
                type="number"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                placeholder="e.g., 500"
                max={selectedProperty.tokenSupply}
                className="w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: {selectedProperty.tokenSupply} tokens •
                {collateralAmount && parseFloat(collateralAmount) > 0 && (
                  <span className="text-success font-semibold"> Max borrow: ₦{calculateMaxBorrow().toLocaleString()}</span>
                )}
              </p>
            </div>

            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                <strong>📝 Note:</strong> This process requires 2 wallet signatures:
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>1️⃣ <strong>Approve</strong> the lending pool to spend your tokens</li>
                <li>2️⃣ <strong>Deposit</strong> the collateral to the lending pool</li>
              </ol>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ Sign both transactions quickly to avoid timeout!
              </p>
            </div>

            {processingStep && (
              <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 text-center">
                  {processingStep}
                  <br />
                  <span className="text-xs">Check your wallet for signature requests</span>
                </p>
              </div>
            )}

            <button
              onClick={handleDepositCollateral}
              disabled={!collateralAmount || parseFloat(collateralAmount) <= 0 || parseFloat(collateralAmount) > selectedProperty.tokenSupply || processing}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Deposit Collateral'}
            </button>
          </div>
        )}

        {/* Borrow */}
        {step === 'borrow' && selectedProperty && (
          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Borrow heNGN</h2>

            <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-success">✅ Collateral deposited: {collateralAmount} tokens</p>
              {maxBorrowFromContract && parseFloat(maxBorrowFromContract) > 0 && (
                <p className="text-sm text-success mt-1">
                  💰 Max you can borrow: <strong>₦{(parseFloat(maxBorrowFromContract) / 100).toLocaleString()}</strong>
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Borrow Amount (heNGN)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  placeholder="e.g., 1000000"
                  className="flex-1 px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setBorrowAmount((parseFloat(maxBorrowFromContract) / 100).toString())}
                  disabled={!maxBorrowFromContract || parseFloat(maxBorrowFromContract) <= 0}
                  className="px-4 py-3 bg-primary/20 text-primary border border-primary/30 rounded-lg font-medium hover:bg-primary/30 disabled:opacity-50"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter amount in Naira (₦). Max: ₦{(parseFloat(maxBorrowFromContract) / 100).toLocaleString()} • Rate: {CONFIG.INTEREST_RATE}% APR
              </p>
            </div>

            <button
              onClick={handleBorrow}
              disabled={!borrowAmount || parseFloat(borrowAmount) <= 0 || processing}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Borrow heNGN'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}