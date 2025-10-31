'use client';


import { useEffect, useState } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { useContract } from '@/hooks/useContract';
import { api } from '@/lib/api';
import { CONFIG } from '@/constants';
import type { Property, Loan } from '@/types';

export default function DashboardPage() {
  const { isConnected, accountId } = useHashConnect();
  const { getLoanDetails, withdrawCollateral } = useContract();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's properties
        const propsResponse = await api.getProperties(accountId);
        if (propsResponse.success) {
          setProperties(propsResponse.properties);
        }

        // Fetch loan details from the contract
        setLoadingLoan(true);
        try {
          const details = await getLoanDetails(accountId);
          console.log('📊 Loan details from contract:', details);
          setLoanDetails(details);

          // Also try to fetch loan data from backend (legacy)
          try {
            const loanResponse = await api.getLoan(accountId);
            if (loanResponse.success && loanResponse.loan) {
              setLoan(loanResponse.loan);
            }
          } catch {
            // No loan exists in backend, that's ok
            setLoan(null);
          }
        } catch (error) {
          console.error('Failed to fetch loan details:', error);
          setLoanDetails(null);
        } finally {
          setLoadingLoan(false);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, accountId]);

  // Handle collateral withdrawal
  const handleWithdrawCollateral = async () => {
    if (!loanDetails || !accountId) return;

    const collateralAmount = loanDetails.collateralAmount;
    const propertyId = loanDetails.propertyId;

    const confirmed = confirm(
      `🔓 WITHDRAW COLLATERAL\n\n` +
      `You are about to withdraw ${collateralAmount} RWA tokens from the lending pool.\n\n` +
      `Property ID: ${propertyId}\n` +
      `Tokens: ${collateralAmount}\n\n` +
      `⚠️ Important:\n` +
      `• Tokens will be returned to your wallet\n` +
      `• Property will be delisted from tokenized properties\n` +
      `• Our team will contact you to arrange off-chain property transfer\n\n` +
      `This requires your wallet signature.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    try {
      setWithdrawing(true);

      // Call withdraw collateral on smart contract
      const result = await withdrawCollateral(collateralAmount);

      if (result.success) {
        alert(
          `✅ Collateral withdrawn successfully!\n\n` +
          `Transaction: ${result.txHash}\n\n` +
          `${collateralAmount} RWA tokens have been returned to your wallet.\n\n` +
          `📝 Next Steps:\n` +
          `1. Our team will contact you within 24-48 hours\n` +
          `2. We'll arrange the property documentation transfer\n` +
          `3. Property will be delisted from the platform`
        );

        // Call backend to delist property
        try {
          await api.delistProperty(accountId, propertyId);
        } catch (err) {
          console.error('Failed to delist property in backend:', err);
          // Don't fail the whole operation if backend delisting fails
        }

        // Refresh loan details
        const updatedDetails = await getLoanDetails(accountId);
        setLoanDetails(updatedDetails);

        // Refresh properties
        const propsResponse = await api.getProperties(accountId);
        if (propsResponse.success) {
          setProperties(propsResponse.properties);
        }
      }
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      alert(`❌ Withdrawal failed:\n${error.message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-8">
            <p className="text-warning font-medium mb-4">⚠️ Wallet Not Connected</p>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to view your dashboard.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
            >
              Connect Wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const totalValue = properties.reduce((sum, p) => sum + p.value, 0);
  const verifiedCount = properties.filter(p => p.status === 'verified').length;

  return (
    <div className="container mx-auto px-4 py-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {accountId}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Properties */}
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Properties</p>
          <p className="text-3xl font-bold">{properties.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {verifiedCount} verified
          </p>
        </div>

        {/* Total Value */}
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Value</p>
          <p className="text-3xl font-bold">₦{(totalValue / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-muted-foreground mt-1">
            Portfolio value
          </p>
        </div>

        {/* Loan Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-2">Loan Status</p>
          {loading || loadingLoan ? (
            <>
              <p className="text-2xl font-bold text-muted-foreground">Loading...</p>
            </>
          ) : loanDetails && parseFloat(loanDetails.collateralAmount) > 0 ? (
            <>
              {parseFloat(loanDetails.borrowedAmount) > 0 ? (
                <>
                  <p className="text-3xl font-bold">₦{(parseFloat(loanDetails.borrowedAmount) / 100).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Borrowed • Health: {loanDetails.healthFactor !== '0' && loanDetails.healthFactor !== '115792089237316195423570985008687907853269984665640564039457584007913129639935' ? `${(parseFloat(loanDetails.healthFactor) / 1).toFixed(0)}%` : '∞'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-success">₦{(parseFloat(loanDetails.maxBorrow) / 100 / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available to borrow • {loanDetails.collateralAmount} tokens locked
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-3xl font-bold">₦0</p>
              <p className="text-xs text-muted-foreground mt-1">No collateral deposited</p>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/tokenize"
          className="p-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
        >
          + Tokenize Property
        </Link>
        <Link
          href="/borrow"
          className="p-4 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
        >
          💸 Borrow heNGN
        </Link>
        <Link
          href="/repay"
          className="p-4 bg-card border border-border rounded-lg font-medium hover:bg-card/80 transition-colors text-center"
        >
          💰 Repay Loan
        </Link>
      </div>

      {/* Loan Info Message */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-bold mb-2">📊 Loan Details</h2>
        <p className="text-sm text-muted-foreground mb-4">
          To view your complete loan details (collateral, borrowed amount, health factor, etc.),
          you can check the smart contract directly on HashScan.
        </p>
        <div className="flex gap-4">
          <a
            href={`https://hashscan.io/testnet/contract/${CONFIG.LENDING_POOL_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30"
          >
            View Contract on HashScan →
          </a>
        </div>
      </div>

      {/* Withdraw Collateral Section - Only show if collateral exists and NO active loan */}
      {!loading && !loadingLoan && loanDetails &&
       parseFloat(loanDetails.collateralAmount) > 0 &&
       parseFloat(loanDetails.borrowedAmount) === 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold mb-2">🔓 Withdraw Collateral</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You have {loanDetails.collateralAmount} RWA tokens locked as collateral with no active loan.
            You can withdraw your collateral to untokenize your property.
          </p>

          <div className="p-4 bg-background rounded-lg mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Collateral Amount</p>
                <p className="text-xl font-bold">{loanDetails.collateralAmount} tokens</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Property ID</p>
                <p className="text-xl font-bold">{loanDetails.propertyId}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ <strong>Note:</strong> Withdrawing collateral will:
            </p>
            <ul className="text-sm text-amber-600 dark:text-amber-400 ml-6 mt-2 list-disc">
              <li>Return all RWA tokens to your wallet</li>
              <li>Delist the property from tokenized properties</li>
              <li>Initiate off-chain property transfer process</li>
            </ul>
          </div>

          <button
            onClick={handleWithdrawCollateral}
            disabled={withdrawing}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdrawing ? 'Processing Withdrawal...' : '🔓 Withdraw Collateral & Untokenize Property'}
          </button>
        </div>
      )}

      {/* Future: Detailed Loan Section */}
      {false && !loading && !loadingLoan && loanDetails && parseFloat(loanDetails.borrowedAmount) > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📊 Your Loan Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Collateral */}
            <div className="p-4 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Collateral Deposited</p>
              <p className="text-2xl font-bold">{loanDetails.collateralAmount} tokens</p>
              <p className="text-xs text-muted-foreground mt-1">
                Token: {loanDetails.collateralToken.slice(0, 10)}...
              </p>
            </div>

            {/* Borrowed Amount */}
            <div className="p-4 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Borrowed Amount</p>
              <p className="text-2xl font-bold">₦{(parseFloat(loanDetails.borrowedAmount) / 100).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Principal</p>
            </div>

            {/* Total Debt */}
            <div className="p-4 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Debt (with interest)</p>
              <p className="text-2xl font-bold text-orange-500">₦{(parseFloat(loanDetails.totalDebt) / 100).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Interest: ₦{((parseFloat(loanDetails.totalDebt) - parseFloat(loanDetails.borrowedAmount)) / 100).toLocaleString()}
              </p>
            </div>

            {/* Health Factor */}
            <div className="p-4 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Health Factor</p>
              <p className={`text-2xl font-bold ${parseFloat(loanDetails.healthFactor) >= 150 ? 'text-success' : parseFloat(loanDetails.healthFactor) >= 120 ? 'text-warning' : 'text-destructive'}`}>
                {loanDetails.healthFactor}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {parseFloat(loanDetails.healthFactor) >= 150 ? '✅ Healthy' : parseFloat(loanDetails.healthFactor) >= 120 ? '⚠️ Warning' : '🚨 At Risk'}
              </p>
            </div>

            {/* Max Borrow */}
            <div className="p-4 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Additional Borrowing Capacity</p>
              <p className="text-2xl font-bold text-success">₦{(parseFloat(loanDetails.maxBorrow) / 100).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Available to borrow</p>
            </div>

            {/* Interest Rate */}
            <div className="p-4 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
              <p className="text-2xl font-bold">{CONFIG.INTEREST_RATE}%</p>
              <p className="text-xs text-muted-foreground mt-1">APR</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              💡 <strong>Tip:</strong> Keep your health factor above 150% to avoid liquidation risk.
              If it drops below 120%, your collateral can be liquidated.
            </p>
          </div>

          <div className="mt-4 flex gap-4">
            <Link
              href="/repay"
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 text-center"
            >
              Repay Loan
            </Link>
            {parseFloat(loanDetails.maxBorrow) > 0 && (
              <Link
                href="/borrow"
                className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 text-center"
              >
                Borrow More
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Your Properties */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Your Properties</h2>
        
        {properties.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't tokenized any properties yet.
            </p>
            <Link
              href="/tokenize"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
            >
              Tokenize Your First Property
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Link
                key={property.propertyId}
                href={`/properties/${property.propertyId}`}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors"
              >
                {/* Status */}
                <div className="mb-3">
                  {property.status === 'verified' && (
                    <span className="px-2 py-1 bg-success/10 text-success border border-success/20 rounded text-xs font-medium">
                      ✓ Verified
                    </span>
                  )}
                  {property.status === 'pending' && (
                    <span className="px-2 py-1 bg-warning/10 text-warning border border-warning/20 rounded text-xs font-medium">
                      ⏳ Pending
                    </span>
                  )}
                </div>

                {/* Address */}
                <h3 className="font-semibold mb-2 line-clamp-2">{property.address}</h3>
                <p className="text-xs text-muted-foreground mb-4 font-mono">
                  {property.propertyId}
                </p>

                {/* Value */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-semibold">₦{(property.value / 1000000).toFixed(1)}M</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Active Loan (if exists) */}
      {loan && parseFloat(loan.borrowedAmount) > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Active Loan</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Borrowed Amount</p>
                <p className="text-2xl font-bold">₦{(parseFloat(loan.borrowedAmount) / 100).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Debt (with interest)</p>
                <p className="text-2xl font-bold">₦{(parseFloat(loan.totalDebt) / 100).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Collateral</p>
                <p className="text-lg font-semibold">{loan.collateralAmount} tokens</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Health Factor</p>
                <p className={`text-lg font-semibold ${parseInt(loan.healthFactor) >= 150 ? 'text-success' : 'text-warning'}`}>
                  {loan.healthFactor}%
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <Link
                href="/repay"
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-center hover:opacity-90"
              >
                Repay Loan
              </Link>
              <Link
                href="/borrow"
                className="flex-1 px-6 py-3 bg-card border border-border rounded-lg font-medium text-center hover:bg-card/80"
              >
                Borrow More
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}