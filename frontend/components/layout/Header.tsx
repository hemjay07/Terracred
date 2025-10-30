'use client';

import Link from 'next/link';
import { useState, useContext } from 'react';
import { WalletConnectContext } from '@/contexts/WalletConnectContext';
import dynamic from 'next/dynamic';


const HashConnectButton = dynamic(
  () => import('@/components/hashConnectButton'),
  { ssr: false }
);// import { openHashPackModal, hashPackWallet } from '@/services/wallets/hashPackWallet';

export default function Header() {
  const { accountId, isConnected } = useContext(WalletConnectContext);
  const [isConnecting, setIsConnecting] = useState(false);

  // const handleConnect = async () => {
  //   setIsConnecting(true);
  //   try {
  //     await openHashPackModal();
  //     console.log('✅ Wallet connection modal opened');
  //   } catch (error: any) {
  //     console.error('Connection error:', error);
  //     alert(`Failed to connect: ${error.message}`);
  //   } finally {
  //     setIsConnecting(false);
  //   }
  // };

  // const handleDisconnect = () => {
  //   hashPackWallet.disconnect();
  // };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="font-bold text-xl">TerraCred</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/properties" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/borrow" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Borrow
            </Link>
          </nav>

        <HashConnectButton/>
        </div>
      </div>
    </header>
  );
}