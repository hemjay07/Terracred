'use client';


import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWalletStore } from '@/store/wallet';
import { api } from '@/lib/api';
import type { Property, Loan } from '@/types';

export default function DashboardPage() {
  const { isConnected, hederaAccountId } = useWalletStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isConnected || !hederaAccountId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's properties
        const propsResponse = await api.getProperties(hederaAccountId);
        if (propsResponse.success) {
          setProperties(propsResponse.properties);
        }

        // Try to fetch loan data (may not exist)
        try {
          const loanResponse = await api.getLoan(hederaAccountId);
          if (loanResponse.success && loanResponse.loan) {
            setLoan(loanResponse.loan);
          }
        } catch {
          // No loan exists, that's ok
          setLoan(null);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [isConnected, hederaAccountId]);

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
          Welcome back, {hederaAccountId}
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
          <p className="text-sm text-muted-foreground mb-2">Active Loan</p>
          {loan && parseFloat(loan.borrowedAmount) > 0 ? (
            <>
              <p className="text-3xl font-bold">₦{(parseFloat(loan.borrowedAmount) / 100).toLocaleString()}</p>
              <p className="text-xs text-success mt-1">
                Health: {loan.healthFactor}%
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold">₦0</p>
              <p className="text-xs text-muted-foreground mt-1">No active loan</p>
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