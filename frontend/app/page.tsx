'use client';

import { useEffect } from 'react'; // Make sure this is imported
import Link from "next/link";


export default function Home() {

  // Add this right at the start
  useEffect(() => {
    console.log('Checking for wallets...');
    console.log('MetaMask (ethereum):', typeof window.ethereum !== 'undefined');
    
    // Check for HashPack with delay
    setTimeout(() => {
      // @ts-ignore
      console.log('HashPack:', typeof window.hashpack !== 'undefined', window.hashpack);
    }, 3000);
  }, []);
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="text-sm text-primary font-medium">
              Powered by Hedera 💜
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Turn Your Property Into Liquidity
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Nigeria's first real estate DeFi protocol. Tokenize your property, 
            borrow Naira stablecoins, keep your home.
          </p>

          {/* CTA Buttons */}
<div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
  <Link 
    href="/tokenize"
    className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity text-center"
  >
    Get Started
  </Link>
  <Link 
    href="/properties"
    className="px-8 py-4 bg-card border border-border text-foreground rounded-lg font-semibold hover:bg-card/80 transition-colors text-center"
  >
    Learn More
  </Link>
</div>
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Instant Settlement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Secure on Hedera</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Eco-Friendly</span>
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center p-8 rounded-lg bg-card border border-border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Tokenize Property</h3>
              <p className="text-muted-foreground">
                Submit your property details. Get it verified and receive RWA tokens.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-8 rounded-lg bg-card border border-border">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-accent">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Borrow heNGN</h3>
              <p className="text-muted-foreground">
                Lock your tokens as collateral. Borrow Naira stablecoins instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-8 rounded-lg bg-card border border-border">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-success">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Repay & Unlock</h3>
              <p className="text-muted-foreground">
                Pay back your loan anytime. Unlock your collateral. Keep your property.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}