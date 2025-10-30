'use client';

import { useState } from 'react';
import { CONFIG } from '@/constants';

export function AssociateTokenButton() {
  const [associating, setAssociating] = useState(false);
  const [associated, setAssociated] = useState(false);

  

  const handleAssociate = () => {
    setAssociating(true);
    
    // Guide user to HashPack
    const message = `Please open your HashPack wallet and:\n\n` +
      `1. Go to "Tokens" tab\n` +
      `2. Click "Associate Token"\n` +
      `3. Enter Token ID: ${CONFIG.MASTER_RWA_TOKEN_ID}\n` +
      `4. Confirm the association\n\n` +
      `Once done, come back and click "I've Associated" below.`;
    
    alert(message);
    setAssociating(false);
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
      <h3 className="font-semibold mb-2">📌 Step 1: Associate TerraCred Token</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Before tokenizing your property, you must associate the TCRED token with your HashPack wallet.
        This is a one-time operation that allows you to receive property tokens.
      </p>
      
      <div className="bg-background border border-border rounded p-3 mb-4">
        <p className="text-xs text-muted-foreground mb-1">Token ID:</p>
        <p className="font-mono text-sm font-semibold">{CONFIG.MASTER_RWA_TOKEN_ID}</p>
      </div>
      
      <div className="flex items-center gap-4">
        {!associated ? (
          <>
            <button
              onClick={handleAssociate}
              disabled={associating}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🦜 Open HashPack Instructions
            </button>
            <button
              onClick={() => setAssociated(true)}
              className="px-6 py-2 bg-success text-white rounded-lg font-medium hover:opacity-90"
            >
              ✅ I've Associated
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-success font-semibold">✅ Token Associated!</span>
            <button
              onClick={() => setAssociated(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              (Reset)
            </button>
          </div>
        )}
      </div>
      
      {associated && (
        <p className="text-sm text-success mt-3">
          ✅ Great! You can now proceed to submit your property. When it's verified, tokens will be transferred to your wallet automatically.
        </p>
      )}
    </div>
  );
}