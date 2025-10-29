'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Property } from '@/types';

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperty() {
      try {
        const response = await api.getProperty(propertyId);
        if (response.success) {
          setProperty(response.property);
        } else {
          setError('Property not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProperty();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-muted-foreground">Loading property...</div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-6">
            <p className="text-danger font-medium">❌ {error || 'Property not found'}</p>
            <Link href="/properties" className="text-sm text-primary hover:underline mt-2 inline-block">
              ← Back to Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-3 py-1 bg-success/10 text-success border border-success/20 rounded-full text-sm font-medium">✓ Verified</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-warning/10 text-warning border border-warning/20 rounded-full text-sm font-medium">⏳ Pending</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-danger/10 text-danger border border-danger/20 rounded-full text-sm font-medium">✗ Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/properties" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block">
          ← Back to Properties
        </Link>

        {/* Property Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">{property.address}</h1>
            {getStatusBadge(property.status)}
          </div>
          <p className="text-muted-foreground">Property ID: {property.propertyId}</p>
        </div>

        {/* Property Details Card */}
        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6">Property Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owner */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Owner</p>
              <p className="font-mono text-sm">{property.owner}</p>
            </div>

            {/* Value */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Property Value</p>
              <p className="text-2xl font-bold text-foreground">
                ₦{property.value.toLocaleString()}
              </p>
            </div>

            {/* Token Supply */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Token Supply</p>
              <p className="font-semibold">{property.tokenSupply} tokens</p>
            </div>

            {/* Token Value */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Token Value</p>
              <p className="font-semibold">
                ₦{(property.value / property.tokenSupply).toLocaleString()} each
              </p>
            </div>

            {/* Created */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Submitted</p>
              <p className="text-sm">{new Date(property.createdAt).toLocaleDateString()}</p>
            </div>

            {/* Verified */}
            {property.verifiedAt && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Verified</p>
                <p className="text-sm">{new Date(property.verifiedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Description</p>
              <p className="text-foreground">{property.description}</p>
            </div>
          )}
        </div>

        {/* Token Info (if verified) */}
        {property.status === 'verified' && property.tokenId && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4 text-foreground">🎉 Property Tokenized!</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token ID:</span>
                <span className="font-mono">{property.tokenId}</span>
              </div>
              {property.tokenAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Address:</span>
                  <span className="font-mono text-xs">{property.tokenAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Status */}
        {property.status === 'pending' && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-6">
            <p className="font-medium mb-2">⏳ Verification in Progress</p>
            <p className="text-sm text-muted-foreground">
              Your property is being reviewed by our verification team. This typically takes 24-48 hours.
              You'll be notified once the verification is complete.
            </p>
          </div>
        )}

        {/* Action Buttons (if verified) */}
        {property.status === 'verified' && (
          <div className="flex gap-4">
            <Link
              href="/borrow"
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-center hover:opacity-90 transition-opacity"
            >
              Use as Collateral
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 px-6 py-3 bg-card border border-border rounded-lg font-semibold text-center hover:bg-card/80 transition-colors"
            >
              View in Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
