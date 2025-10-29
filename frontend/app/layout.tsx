import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { AllWalletsProvider } from '@/services/wallets/AllWalletsProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TerraCred - Real Estate DeFi",
  description: "Borrow against tokenized real estate on Hedera",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AllWalletsProvider>
          <Header />
          {children}
        </AllWalletsProvider>
      </body>
    </html>
  );
}