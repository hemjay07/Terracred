import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="font-bold text-xl">TerraCred</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Nigeria's first real estate DeFi protocol. Built on Hedera for speed, security, and sustainability.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary">💜</span>
              <span>Powered by Hedera</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/properties" className="hover:text-foreground transition-colors">
                  Properties
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/borrow" className="hover:text-foreground transition-colors">
                  Borrow
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a 
                  href="https://docs.hedera.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Hedera Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://portal.hedera.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Hedera Portal
                </a>
              </li>
              <li>
                <a 
                  href="https://hashscan.io/testnet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  HashScan
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 TerraCred. Built for Hedera Africa Hackathon 🚀
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="text-success">●</span>
            <span>Testnet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
