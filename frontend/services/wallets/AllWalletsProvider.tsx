'use client';

import { ReactNode } from "react";
import { WalletConnectContextProvider } from "@/contexts/WalletConnectContext";
import { HashPackClient } from "./hashpackClient";

// Purpose: Wrapper component that provides all wallet functionality
// Simplified to HashPack-only for TerraCred
export const AllWalletsProvider = (props: {
  children: ReactNode | undefined
}) => {
  return (
    <WalletConnectContextProvider>
      <HashPackClient />
      {props.children}
    </WalletConnectContextProvider>
  );
};
