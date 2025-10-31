'use client';

import { AssociateTokenButton } from '@/components/AssociateTokenButton';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useHashConnect from '@/hooks/useHashConnect';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function TokenizePage() {
  const router = useRouter();
  const { isConnected, accountId } = useHashConnect();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    value: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !accountId) {
      alert('Please connect your wallet first!');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.submitProperty({
        owner: accountId,
        address: formData.address,
        value: parseInt(formData.value),
        description: formData.description,
        tokenSupply: parseInt(formData.value), // Auto-calculate: 1 token = ₦1
      });

      if (response.success) {
        alert(`✅ Property submitted successfully!\nProperty ID: ${response.property.propertyId}`);
        router.push(`/properties/${response.property.propertyId}`);
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(`❌ Failed to submit property: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Tokenize Your Property</h1>
          <p className="text-muted-foreground">
            Submit your property details to get it verified and tokenized on Hedera.
          </p>
        </div>

        {/* Wallet Check */}
        {!isConnected ? (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-6 mb-8">
            <p className="text-warning font-medium mb-2">⚠️ Wallet Not Connected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Please connect your HashPack wallet to submit a property.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              Go Back & Connect
            </Link>
          </div>
        ) : (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-8">
            <p className="text-sm text-success">
              ✅ Connected with HashPack: {accountId}
            </p>
          </div>
        )}

        {/* Association Button */}
        {isConnected && <AssociateTokenButton />}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-lg p-8"
        >
          {/* Property Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Property Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              placeholder="e.g., 123 Victoria Island, Lagos, Nigeria"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Property Value */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Property Value (₦) *
            </label>
            <input
              type="number"
              name="value"
              value={formData.value}
              onChange={handleChange}
              required
              placeholder="e.g., 50000000"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the total value of your property in Nigerian Naira
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="e.g., 4-bedroom apartment with ocean view, fully furnished..."
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Token Supply - Auto-calculated (Read-only) */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm font-medium text-blue-400 mb-2">
              🪙 Token Supply (Auto-calculated)
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">
                {formData.value ? parseInt(formData.value).toLocaleString() : '0'}
              </p>
              <p className="text-sm text-muted-foreground">tokens</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 <strong>1 token = ₦1</strong> under our new economics model.
              <br />
              Your ₦{formData.value ? parseInt(formData.value).toLocaleString() : '0'} property will automatically receive {formData.value ? parseInt(formData.value).toLocaleString() : '0'} tokens.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">💡 What happens next?</span>
              <br />
              1. Your property will be reviewed by our verification team
              <br />
              2. Once verified, TCRED tokens will be minted to your wallet
              <br />
              3. You can use these tokens as collateral to borrow heNGN
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isConnected || isSubmitting}
            className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Property'}
          </button>
        </form>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? Contact us at support@terracred.com
        </p>
      </div>
    </div>
  );
}
