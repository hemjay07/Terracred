'use client';

import { useState } from 'react';
import { CONFIG } from '@/constants';

export function AssociateHeNGNButton() {
  const [associating, setAssociating] = useState(false);
  const [associated, setAssociated] = useState(false);

  const handleAssociate = () => {
    setAssociating(true);

    // Guide user to HashPack
    const message = `To receive heNGN tokens, please associate the token in HashPack:\n\n` +
      `1. Open your HashPack wallet\n` +
      `2. Go to "Tokens" tab\n` +
      `3. Click "Associate Token"\n` +
      `4. Enter Token ID: ${CONFIG.HENGN_TOKEN_ID}\n` +
      `5. Confirm the association\n\n` +
      `This is a one-time operation. Once done, you'll be able to receive and see heNGN tokens!`;

    alert(message);
    setAssociating(false);
  };

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-2 text-blue-400">💰 Associate heNGN Token</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Before you can receive heNGN tokens, you must associate the token with your wallet.
        This is a one-time operation per account.
      </p>

      <div className="bg-background border border-border rounded p-3 mb-3">
        <p className="text-xs text-muted-foreground mb-1">heNGN Token ID:</p>
        <p className="font-mono text-sm font-semibold text-blue-400">{CONFIG.HENGN_TOKEN_ID}</p>
        <p className="text-xs text-muted-foreground mt-1">Address: {CONFIG.HENGN_TOKEN_ADDRESS}</p>
      </div>

      <div className="flex items-center gap-3">
        {!associated ? (
          <>
            <button
              onClick={handleAssociate}
              disabled={associating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              🦜 Open Instructions
            </button>
            <button
              onClick={() => setAssociated(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              ✅ I've Associated
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-semibold text-sm">✅ heNGN Associated!</span>
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
        <p className="text-sm text-green-500 mt-3">
          ✅ Perfect! You can now borrow heNGN and it will appear in your wallet.
        </p>
      )}
    </div>
  );
}
