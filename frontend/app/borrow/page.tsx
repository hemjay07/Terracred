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
        // Fetch properties
        const response = await api.getProperties(accountId);
        if (response.success) {
          const verified = response.properties.filter(p => p.status === 'verified');
          setProperties(verified);
        }

        // Check if user already has active collateral
        const details = await getLoanDetails(accountId);
        setLoanDetails(details);

        // If user has active collateral, they can only borrow more (not deposit different property)
        if (parseFloat(details.collateralAmount) > 0) {
          setMaxBorrowFromContract(details.maxBorrow);
          // Find which property is being used
          const collateralProperty = response.properties.find(
            p => p.tokenAddress?.toLowerCase() === details.collateralToken.toLowerCase()
          );

          if (collateralProperty) {
            setSelectedProperty(collateralProperty);
            setStep('borrow'); // Skip to borrow step
          } else {
            // Create a synthetic property object from blockchain data
            // ⭐ Calculate actual value from contract's maxBorrow (in Naira)
            const maxBorrowNaira = parseFloat(details.maxBorrow);
            const inferredPropertyValue = maxBorrowNaira > 0 ? maxBorrowNaira * 1.5 : 400000000;

            const syntheticProperty: Property = {
              propertyId: details.propertyId || 'BLOCKCHAIN',
              owner: accountId,
              address: 'Property from Blockchain',
              value: inferredPropertyValue, // ⭐ Infer from contract's maxBorrow
              description: 'Collateral deposited directly on blockchain',
              status: 'verified',
              tokenId: details.collateralToken,
              tokenAddress: details.collateralToken,
              tokenSupply: parseInt(details.collateralAmount),
              verifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            setSelectedProperty(syntheticProperty);
            setStep('borrow'); // Skip to borrow step
          }
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
    setBorrowAmount('');
    setStep('deposit');
  };

  const handleDepositCollateral = async () => {
    if (!selectedProperty || !accountId) return;

    // ALL-OR-NOTHING MODEL: User must deposit entire property
    const allTokens = selectedProperty.tokenSupply.toString();
    // ⭐ Property value stays in NAIRA (matches 1 token = ₦1 model)
    // Only heNGN amounts use kobo (2 decimals), not property values!
    const totalPropertyValue = selectedProperty.value;

    // Warn user about the process
    const confirmed = confirm(
      '🏠 PROPERTY COLLATERAL AGREEMENT\n\n' +
      `You are using your ENTIRE property as collateral:\n` +
      `• Property: ${selectedProperty.address}\n` +
      `• Total Value: ₦${(totalPropertyValue / 1000000).toFixed(1)}M\n` +
      `• All ${selectedProperty.tokenSupply} tokens will be locked\n\n` +
      `LOAN TERMS:\n` +
      `• Borrow up to 66% LTV (₦${(totalPropertyValue * 0.6667 / 1000000).toFixed(1)}M max)\n` +
      `• Interest: ${CONFIG.INTEREST_RATE}% APR (accrues daily)\n` +
      `• Repayment Period: ${CONFIG.LOAN_TERM_MONTHS} months\n` +
      `• Repay anytime before due date\n\n` +
      `💡 How It Works:\n` +
      `• Entire property is collateral (like a traditional mortgage)\n` +
      `• Repay principal + interest to unlock your property\n` +
      `• If liquidated: debt paid first, surplus returns to you\n\n` +
      '⚠️ This requires 2 wallet signatures:\n' +
      '1. Approve token spending\n' +
      '2. Deposit collateral\n\n' +
      'Click OK to continue.'
    );

    if (!confirmed) return;

    setProcessing(true);
    try {
      setProcessingStep('Step 1/2: Requesting token approval - Check your wallet!');

      console.log('🔷 BORROW PAGE: Depositing ENTIRE property as collateral:');
      console.log('  Token Address:', selectedProperty.tokenAddress);
      console.log('  Collateral Amount (tokens):', allTokens, '(ALL)');
      console.log('  Property ID:', selectedProperty.propertyId);
      console.log('  Total Property Value (Naira):', totalPropertyValue);
      console.log('  Max LTV (66%):', totalPropertyValue * 0.6667);

      const result = await depositCollateral(
        selectedProperty.tokenAddress!,
        allTokens,
        selectedProperty.propertyId,
        totalPropertyValue.toString()
      );

      setProcessingStep('Waiting for transaction confirmation...');
      // Wait for transaction to be confirmed on Hedera network
      // Mirror node needs time to index the transaction
      await new Promise(resolve => setTimeout(resolve, 3000));

      setProcessingStep('Fetching your loan details...');

      // Fetch loan details with retry logic (transaction might still be indexing)
      let details;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        details = await getLoanDetails(accountId);

        // Check if we got valid collateral data
        if (parseFloat(details.collateralAmount) > 0) {
          console.log('✅ Loan details confirmed:', details);
          break;
        }

        // If no collateral yet, wait and retry
        if (retries < maxRetries - 1) {
          console.log(`⏳ Loan not indexed yet, retrying (${retries + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        retries++;
      }

      setLoanDetails(details!);
      setMaxBorrowFromContract(details!.maxBorrow);

      setProcessingStep('');

      // Show appropriate message based on whether loan data was retrieved
      if (details && parseFloat(details.collateralAmount) > 0) {
        alert(`✅ Collateral deposited!\nTx: ${result.txHash}\n\nMax you can borrow: ₦${parseFloat(details.maxBorrow).toLocaleString()}`);
      } else {
        alert(`✅ Collateral deposited!\nTx: ${result.txHash}\n\n⏳ Note: Loan details are still indexing. Please refresh the page in a few seconds to see your borrowing limit.`);
      }

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

    // ⭐ maxBorrowFromContract is in NAIRA (matches property value units)
    const requestedAmountNaira = parseFloat(borrowAmount);
    const maxBorrowNaira = parseFloat(maxBorrowFromContract);

    if (requestedAmountNaira > maxBorrowNaira) {
      alert(`❌ Cannot borrow ₦${borrowAmount}\n\nMaximum you can borrow: ₦${maxBorrowNaira.toLocaleString()}\n\nThis is based on your collateral value and the ${CONFIG.MAX_LTV}% LTV ratio.`);
      return;
    }

    if (requestedAmountNaira <= 0) {
      alert('❌ Please enter a valid borrow amount greater than 0');
      return;
    }

    setProcessing(true);
    try {
      // ⭐ Contract expects amount in NAIRA (matching maxBorrow units), NOT kobo!
      // The contract handles heNGN transfer internally with proper units
      const amountNaira = Math.floor(requestedAmountNaira).toString();
      const result = await borrow(amountNaira);

      alert(`✅ Borrowed ₦${borrowAmount} heNGN!\n\nTransaction: ${result.txHash}\n\n💡 Check your HashPack wallet for the heNGN tokens.\nIf you don't see them, you may need to associate the heNGN token first.`);
      window.location.href = '/dashboard';
    } catch (error: any) {
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Removed calculateMaxBorrow - now using entire property value from contract

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

            {/* Warning if they already have active collateral */}
            {loanDetails && parseFloat(loanDetails.collateralAmount) > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-warning">
                  ⚠️ <strong>You already have an active loan!</strong>
                  <br />
                  You can only use one property as collateral at a time. To use a different property,
                  please repay your current loan first.
                </p>
              </div>
            )}

            {properties.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No verified properties yet.</p>
                <Link href="/tokenize" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg">
                  Tokenize Property
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map((property) => {
                  const isCollateral = loanDetails &&
                    property.tokenAddress?.toLowerCase() === loanDetails.collateralToken.toLowerCase() &&
                    parseFloat(loanDetails.collateralAmount) > 0;

                  return (
                    <button
                      key={property.propertyId}
                      onClick={() => !isCollateral && handlePropertySelect(property)}
                      disabled={loanDetails && parseFloat(loanDetails.collateralAmount) > 0 && !isCollateral}
                      className={`w-full p-4 bg-background border rounded-lg transition text-left ${
                        isCollateral
                          ? 'border-primary bg-primary/5'
                          : loanDetails && parseFloat(loanDetails.collateralAmount) > 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-primary cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{property.address}</p>
                          <p className="text-xs text-muted-foreground">{property.propertyId}</p>
                          {isCollateral && (
                            <p className="text-xs text-primary mt-1">🔒 Currently used as collateral</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">₦{(property.value / 1000000).toFixed(1)}M</p>
                          <p className="text-xs text-muted-foreground">{property.tokenSupply} tokens</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
            <h2 className="text-xl font-semibold mb-4">Use Property as Collateral</h2>

            {/* Property Summary */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-primary mb-2">🏠 Property Details</p>
              <p className="font-semibold">{selectedProperty.address}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedProperty.propertyId}</p>

              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-primary/20">
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold">₦{(selectedProperty.value / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property Tokens</p>
                  <p className="text-lg font-bold">{selectedProperty.tokenSupply} tokens</p>
                </div>
              </div>
            </div>

            {/* Loan Terms */}
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm font-medium text-blue-400 mb-3">
                📋 Loan Terms & Conditions
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-background/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Max Loan (LTV)</p>
                  <p className="font-bold text-sm">₦{(selectedProperty.value * 0.6667 / 1000000).toFixed(1)}M (66%)</p>
                </div>
                <div className="bg-background/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Interest Rate</p>
                  <p className="font-bold text-sm">{CONFIG.INTEREST_RATE}% APR</p>
                </div>
                <div className="bg-background/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Loan Term</p>
                  <p className="font-bold text-sm">{CONFIG.LOAN_TERM_MONTHS} months</p>
                </div>
                <div className="bg-background/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Collateral</p>
                  <p className="font-bold text-sm">{selectedProperty.tokenSupply} tokens (100%)</p>
                </div>
              </div>
              <div className="pt-3 border-t border-blue-500/20">
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ Repay anytime before due date to unlock property</li>
                  <li>✅ Interest accrues daily on borrowed amount</li>
                  <li>⚠️ If liquidated: surplus value returned to you</li>
                </ul>
              </div>
            </div>

            {/* Two-Step Process Warning */}
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                <strong>📝 Two Wallet Signatures Required:</strong>
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>1️⃣ <strong>Approve</strong> the lending pool to use your property tokens</li>
                <li>2️⃣ <strong>Deposit</strong> all tokens as collateral</li>
              </ol>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ Keep your wallet open and sign both transactions quickly!
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
              disabled={processing}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Use Entire Property as Collateral (${selectedProperty.tokenSupply} tokens)`}
            </button>
          </div>
        )}

        {/* Borrow */}
        {step === 'borrow' && selectedProperty && (
          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Borrow heNGN</h2>

            {/* Show collateral property info */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-primary mb-1">🏠 Collateral Property</p>
              <p className="font-semibold">{selectedProperty.address}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedProperty.propertyId}
              </p>
            </div>

            {/* Loan Timeline & Critical Info */}
            {loanDetails && parseFloat(loanDetails.timestamp) > 0 && parseFloat(loanDetails.dueDate) > 0 && (() => {
              const loanStartDate = new Date(parseInt(loanDetails.timestamp) * 1000);
              // Use actual due date from contract instead of calculating
              const dueDate = new Date(parseInt(loanDetails.dueDate) * 1000);
              const daysElapsed = Math.floor((Date.now() - loanStartDate.getTime()) / (1000 * 60 * 60 * 24));
              const daysRemaining = Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysRemaining < 0;
              const isDueSoon = daysRemaining <= 30 && daysRemaining > 0;

              return (
                <div className={`border rounded-lg p-4 mb-4 ${isOverdue ? 'bg-destructive/10 border-destructive/20' : isDueSoon ? 'bg-warning/10 border-warning/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                  <p className={`text-sm font-medium mb-2 ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : 'text-blue-400'}`}>
                    {isOverdue ? '🚨 LOAN OVERDUE' : isDueSoon ? '⚠️ DUE SOON' : '📅 Loan Timeline'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Loan Started:</p>
                      <p className="font-semibold">
                        {loanStartDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Loan Term:</p>
                      <p className="font-semibold">
                        {CONFIG.LOAN_TERM_MONTHS} months
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date:</p>
                      <p className={`font-semibold ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : ''}`}>
                        {dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {isOverdue ? 'Days Overdue:' : 'Days Remaining:'}
                      </p>
                      <p className={`text-lg font-bold ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : 'text-success'}`}>
                        {isOverdue ? Math.abs(daysRemaining) : daysRemaining} days
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-current/20">
                    {isOverdue ? (
                      <p className="text-xs text-destructive font-medium">
                        🚨 <strong>URGENT:</strong> Your loan is overdue! Repay immediately to avoid liquidation.
                      </p>
                    ) : isDueSoon ? (
                      <p className="text-xs text-warning font-medium">
                        ⚠️ <strong>Warning:</strong> Loan due in {daysRemaining} days. Repay soon to avoid default.
                      </p>
                    ) : (
                      <p className="text-xs text-blue-300">
                        💡 <strong>Interest accrues at {CONFIG.INTEREST_RATE}% APR.</strong> You have {daysRemaining} days to repay.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Elapsed: {daysElapsed} days of {CONFIG.LOAN_TERM_MONTHS * 30} days
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Manage Loan Actions */}
            {loanDetails && parseFloat(loanDetails.borrowedAmount) > 0 && (
              <div className="bg-card border border-primary rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold">💼 Loan Management</h3>
                  <Link
                    href="/repay"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Repay Loan →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-background/50 rounded p-2">
                    <p className="text-muted-foreground mb-1">Total Debt</p>
                    <p className="text-sm font-bold text-orange-500">
                      ₦{(parseFloat(loanDetails.totalDebt) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Principal: ₦{(parseFloat(loanDetails.borrowedAmount) / 100).toFixed(2)}
                      <br />
                      Interest: ₦{(parseFloat(loanDetails.accruedInterest) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <p className="text-muted-foreground mb-1">Extension Status</p>
                    {loanDetails.extensionUsed ? (
                      <p className="text-sm font-bold text-muted-foreground">✓ Used</p>
                    ) : (() => {
                      const dueDate = parseInt(loanDetails.dueDate);
                      if (dueDate === 0) return <p className="text-sm font-bold text-muted-foreground">N/A</p>;

                      const now = Math.floor(Date.now() / 1000);
                      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
                      const isEligible = now >= dueDate - thirtyDaysInSeconds && now <= dueDate;

                      return isEligible ? (
                        <>
                          <p className="text-sm font-bold text-success">✓ Available</p>
                          <p className="text-xs text-muted-foreground mt-1">Visit repay page to extend</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-muted-foreground">Not yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Available 30 days before due date</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Collateral & Equity Summary */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-success mb-3">✅ Property Locked as Collateral</p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Property Value</p>
                  <p className="text-lg font-bold text-success">
                    {(() => {
                      // ⭐ Calculate actual property value from contract's maxBorrow
                      // maxBorrowFromContract is in NAIRA (not kobo!)
                      const maxBorrowNaira = parseFloat(maxBorrowFromContract);
                      if (maxBorrowNaira > 0) {
                        // maxBorrow = propertyValue * (100/150) = propertyValue * 0.6667
                        // So: propertyValue = maxBorrow / 0.6667 = maxBorrow * 1.5
                        const actualPropertyValue = maxBorrowNaira * 1.5;
                        return `₦${(actualPropertyValue / 1000000).toFixed(1)}M`;
                      }
                      // Fallback to database value if no contract data
                      return `₦${(selectedProperty.value / 1000000).toFixed(1)}M`;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tokens Locked</p>
                  <p className="text-lg font-bold text-success">
                    {(loanDetails?.collateralAmount && parseFloat(loanDetails.collateralAmount) > 0)
                      ? loanDetails.collateralAmount
                      : selectedProperty.tokenSupply}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Debt</p>
                  <p className="text-lg font-bold text-orange-500">
                    ₦{((parseFloat(loanDetails?.totalDebt || '0') / 100) / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Your Equity</p>
                  <p className="text-lg font-bold text-blue-400">
                    {(() => {
                      // ⭐ Calculate equity using contract-derived property value
                      // maxBorrowFromContract is in NAIRA
                      const maxBorrowNaira = parseFloat(maxBorrowFromContract);
                      const actualPropertyValue = maxBorrowNaira > 0 ? maxBorrowNaira * 1.5 : selectedProperty.value;
                      const totalDebtNaira = parseFloat(loanDetails?.totalDebt || '0') / 100;
                      return `₦${((actualPropertyValue - totalDebtNaira) / 1000000).toFixed(2)}M`;
                    })()}
                  </p>
                </div>
              </div>

              {maxBorrowFromContract && parseFloat(maxBorrowFromContract) > 0 && (
                <div className="mt-3 pt-3 border-t border-success/20">
                  <p className="text-xs text-muted-foreground">Available to Borrow</p>
                  <p className="text-xl font-bold text-success">
                    {/* ⭐ maxBorrow is in Naira, convert to millions */}
                    ₦{(parseFloat(maxBorrowFromContract) / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(() => {
                      // ⭐ maxBorrowFromContract is in Naira
                      const maxBorrowNaira = parseFloat(maxBorrowFromContract);
                      const actualPropertyValue = maxBorrowNaira * 1.5; // Reverse of 66.67% LTV
                      return `(Max 66% LTV of ₦${(actualPropertyValue / 1000000).toFixed(1)}M = ₦${(maxBorrowNaira / 1000000).toFixed(1)}M total)`;
                    })()}
                  </p>
                </div>
              )}
            </div>

            {/* One property at a time rule */}
            {loanDetails && parseFloat(loanDetails.collateralAmount) > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-400">
                  ℹ️ <strong>Note:</strong> You can only use one property as collateral at a time.
                  Repay your loan to unlock this property and use a different one.
                </p>
              </div>
            )}

            {/* Liquidation Warning */}
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-warning mb-2">⚠️ Important: Liquidation & Equity Protection</p>

              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Current Health Factor:</p>
                {(() => {
                  const hf = loanDetails?.healthFactor || '0';
                  // Check if it's uint256 max (no debt) - display as infinity
                  const isInfinite = hf === '115792089237316195423570985008687907853269984665640564039457584007913129639935' || parseFloat(hf) > 1000000;

                  if (isInfinite) {
                    return (
                      <>
                        <p className="text-2xl font-bold text-success">∞ (No Debt)</p>
                        <p className="text-xs mt-1 text-success">
                          ✅ Perfect - You have no outstanding debt
                        </p>
                      </>
                    );
                  }

                  const healthFactor = parseFloat(hf);
                  return (
                    <>
                      <p className={`text-2xl font-bold ${healthFactor >= 150 ? 'text-success' : healthFactor >= 120 ? 'text-warning' : 'text-destructive'}`}>
                        {healthFactor.toFixed(0)}%
                      </p>
                      <p className="text-xs mt-1">
                        {healthFactor >= 150
                          ? '✅ Safe - Well above liquidation threshold'
                          : healthFactor >= 120
                            ? '⚠️ Warning - Close to liquidation threshold'
                            : '🚨 Danger - At risk of liquidation'}
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className="pt-3 border-t border-warning/20">
                <p className="text-xs font-medium text-warning mb-2">How Liquidation Works:</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>1️⃣ If health factor drops below <strong>{CONFIG.LIQUIDATION_THRESHOLD}%</strong>, anyone can liquidate</li>
                  <li>2️⃣ Liquidator pays your debt (₦{((parseFloat(loanDetails?.totalDebt || '0') / 100) / 1000000).toFixed(2)}M + interest)</li>
                  <li>3️⃣ Liquidator receives your property tokens</li>
                  <li>4️⃣ <strong className="text-blue-400">Your equity (₦{(() => {
                    // ⭐ maxBorrowFromContract is in Naira
                    const maxBorrowNaira = parseFloat(maxBorrowFromContract);
                    const actualPropertyValue = maxBorrowNaira > 0 ? maxBorrowNaira * 1.5 : selectedProperty.value;
                    const totalDebtNaira = parseFloat(loanDetails?.totalDebt || '0') / 100;
                    return ((actualPropertyValue - totalDebtNaira) / 1000000).toFixed(2);
                  })()}M) is protected and returned to you</strong></li>
                </ul>
                <p className="text-xs text-blue-400 mt-2 font-medium">
                  💡 You don't lose your equity! Only the portion needed to cover the debt is used.
                </p>
              </div>
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
                  onClick={() => {
                    // ⭐ maxBorrow is in Naira, use directly
                    setBorrowAmount(maxBorrowFromContract);
                  }}
                  disabled={!maxBorrowFromContract || parseFloat(maxBorrowFromContract) <= 0}
                  className="px-4 py-3 bg-primary/20 text-primary border border-primary/30 rounded-lg font-medium hover:bg-primary/30 disabled:opacity-50"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter amount in Naira (₦). Max: ₦{parseFloat(maxBorrowFromContract).toLocaleString()} • Rate: {CONFIG.INTEREST_RATE}% APR
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