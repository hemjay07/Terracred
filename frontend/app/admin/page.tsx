'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { api } from '@/lib/api';
import { CONFIG } from '@/constants';
import type { Property } from '@/types';

export default function AdminPage() {
  const { isConnected, accountId } = useHashConnect();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [verifying, setVerifying] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = accountId === CONFIG.ADMIN_ACCOUNT_ID;

  useEffect(() => {
    async function fetchAllProperties() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        // ✅ Admin fetches ALL properties (no owner filter)
        const response = await api.getProperties();
        if (response.success) {
          setProperties(response.properties);
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllProperties();
  }, [isConnected, accountId]);

  const handleVerifyProperty = async (propertyId: string) => {
    const confirmed = confirm(
      `🔍 VERIFY PROPERTY ${propertyId}\n\n` +
      `This will:\n` +
      `• Mint RWA tokens to the property owner\n` +
      `• Mark the property as verified\n` +
      `• Allow the property to be used as collateral\n\n` +
      `Are you sure you want to verify this property?`
    );

    if (!confirmed) return;

    setVerifying(propertyId);
    try {
      const response = await fetch(`${CONFIG.API_URL}/properties/${propertyId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifier: accountId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `✅ Property verified successfully!\n\n` +
          `Property ID: ${propertyId}\n` +
          `Token ID: ${result.property.tokenId}\n` +
          `Status: ${result.property.status}\n\n` +
          `The owner can now use this property as collateral.`
        );

        // Refresh properties list
        const refreshResponse = await api.getProperties();
        if (refreshResponse.success) {
          setProperties(refreshResponse.properties);
        }
      } else {
        alert(`❌ Verification failed:\n${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Verification error:\n${error.message}`);
    } finally {
      setVerifying(null);
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    const reason = prompt(
      `❌ REJECT PROPERTY ${propertyId}\n\n` +
      `Please provide a reason for rejection:`
    );

    if (!reason) return;

    try {
      const response = await fetch(`${CONFIG.API_URL}/properties/${propertyId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Property rejected.\n\nReason: ${reason}`);

        // Refresh properties list
        const refreshResponse = await api.getProperties();
        if (refreshResponse.success) {
          setProperties(refreshResponse.properties);
        }
      } else {
        alert(`❌ Rejection failed:\n${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Error:\n${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-1 bg-success/10 text-success border border-success/20 rounded text-xs font-medium">✓ Verified</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-warning/10 text-warning border border-warning/20 rounded text-xs font-medium">⏳ Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-danger/10 text-danger border border-danger/20 rounded text-xs font-medium">✗ Rejected</span>;
      default:
        return null;
    }
  };

  const filteredProperties = properties.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-8">
            <p className="text-warning font-medium mb-4">⚠️ Wallet Not Connected</p>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to access the admin panel.
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

  // Not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-8">
            <p className="text-danger font-medium mb-4">🚫 Access Denied</p>
            <p className="text-muted-foreground mb-6">
              You do not have admin privileges. Only the platform administrator can access this page.
            </p>
            <div className="text-xs text-muted-foreground mb-4">
              <p>Your account: <span className="font-mono">{accountId}</span></p>
              <p>Admin account: <span className="font-mono">{CONFIG.ADMIN_ACCOUNT_ID}</span></p>
            </div>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage and verify property submissions
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Admin account: <span className="font-mono">{accountId}</span>
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Properties</p>
          <p className="text-2xl font-bold">{properties.length}</p>
        </div>
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <p className="text-sm text-warning mb-1">Pending Verification</p>
          <p className="text-2xl font-bold text-warning">
            {properties.filter(p => p.status === 'pending').length}
          </p>
        </div>
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <p className="text-sm text-success mb-1">Verified</p>
          <p className="text-2xl font-bold text-success">
            {properties.filter(p => p.status === 'verified').length}
          </p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
          <p className="text-sm text-danger mb-1">Rejected</p>
          <p className="text-2xl font-bold text-danger">
            {properties.filter(p => p.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          All ({properties.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          Pending ({properties.filter(p => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'verified'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          Verified ({properties.filter(p => p.status === 'verified').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'rejected'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          Rejected ({properties.filter(p => p.status === 'rejected').length})
        </button>
      </div>

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            {filter === 'all'
              ? 'No properties submitted yet.'
              : `No ${filter} properties found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProperties.map((property) => (
            <div
              key={property.propertyId}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{property.address}</h3>
                    {getStatusBadge(property.status)}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">
                    {property.propertyId}
                  </p>
                  {property.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {property.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="text-sm font-mono">{property.owner}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="text-sm font-semibold">₦{(property.value / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Token Supply</p>
                  <p className="text-sm font-semibold">{property.tokenSupply.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-sm">{new Date(property.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {property.status === 'verified' && property.tokenId && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-success font-medium mb-1">✓ Verified</p>
                  <p className="text-xs text-muted-foreground">
                    Token ID: <span className="font-mono">{property.tokenId}</span>
                  </p>
                  {property.verifiedAt && (
                    <p className="text-xs text-muted-foreground">
                      Verified: {new Date(property.verifiedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {property.status === 'rejected' && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-danger font-medium mb-1">✗ Rejected</p>
                  {property.rejectionReason && (
                    <p className="text-xs text-muted-foreground">
                      Reason: {property.rejectionReason}
                    </p>
                  )}
                </div>
              )}

              {/* Actions for pending properties */}
              {property.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVerifyProperty(property.propertyId)}
                    disabled={verifying === property.propertyId}
                    className="flex-1 px-4 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifying === property.propertyId ? 'Verifying...' : '✓ Verify Property'}
                  </button>
                  <button
                    onClick={() => handleRejectProperty(property.propertyId)}
                    disabled={verifying !== null}
                    className="flex-1 px-4 py-2 bg-danger text-white rounded-lg font-medium hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✗ Reject
                  </button>
                </div>
              )}

              {/* View details link */}
              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href={`/properties/${property.propertyId}`}
                  className="text-sm text-primary hover:underline"
                >
                  View Full Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
