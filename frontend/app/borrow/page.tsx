'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { WalletConnectContext } from '@/contexts/WalletConnectContext';
import { useContract } from '@/hooks/useContract';
import { api } from '@/lib/api';
import { CONFIG } from '@/constants';
import type { Property } from '@/types';

export default function BorrowPage() {
  const { isConnected, accountId } = useContext(WalletConnectContext);
  const { depositCollateral, borrow } = useContract();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'deposit' | 'borrow'>('select');

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

    setProcessing(true);
    try {
      const result = await depositCollateral(
        selectedProperty.tokenAddress!,
        collateralAmount,
        selectedProperty.propertyId,
        selectedProperty.value.toString()
      );

      alert(`✅ Collateral deposited!\nTx: ${result.txHash}`);
      
      setStep('borrow');
    } catch (error: any) {
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount) return;

    setProcessing(true);
    try {
      // heNGN has 2 decimals
      const amountCents = (parseFloat(borrowAmount) * 100).toString();
      const result = await borrow(amountCents);

      alert(`✅ Borrowed ${borrowAmount} heNGN!\nTx: ${result.txHash}`);
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
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Borrow Amount (heNGN)</label>
              <input
                type="number"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                placeholder="e.g., 20000000"
                className="w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: ₦{calculateMaxBorrow().toLocaleString()} • Rate: {CONFIG.INTEREST_RATE}% APR
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