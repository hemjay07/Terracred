# TerraCred - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

1. **Install HashPack Wallet**
   ```
   Chrome Extension: https://www.hashpack.app/
   Create/Import Account → Switch to Testnet → Get test HBAR
   ```

2. **Fund Your Account**
   ```
   Visit: https://portal.hedera.com/faucet
   Enter your account ID
   Request test HBAR (1000 HBAR/day)
   ```

---

## 🛠️ Installation

```bash
# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

Open http://localhost:3000

---

## ✅ Test Wallet Connection

### Step 1: Connect Wallet
1. Click "Connect HashPack" button in header
2. WalletConnect modal appears
3. Click "HashPack" option
4. Approve in HashPack extension
5. See your account ID in header: `0.0.xxxxx`

**Expected Console Output:**
```
✅ HashPack extension detected
✅ HashPack connected: 0.0.1234567
```

### Step 2: Test Disconnection
1. Click "Disconnect" button
2. Header shows "Connect HashPack" again
3. Console shows: `👋 Wallet disconnected`

---

## 🏠 Test Property Tokenization

### Step 1: Associate Token (One-Time)
1. Navigate to `/tokenize`
2. Click "Open HashPack Instructions"
3. Open HashPack wallet extension
4. Go to "Tokens" tab
5. Click "Associate Token"
6. Enter Token ID: `0.0.7119378`
7. Confirm association
8. Return to app, click "I've Associated"

### Step 2: Submit Property
1. Fill in property details:
   - Address: `123 Test Street, Lagos`
   - Value: `50000000` (50M Naira)
   - Description: `Test property`
   - Token Supply: `1000`
2. Click "Submit Property"
3. Backend processes submission
4. Property gets `propertyId` (e.g., PROP004)

---

## 💰 Test Borrowing

### Verify Property First (Backend Demo)
```bash
# In another terminal
cd backend
npm run dev

# The backend auto-verifies for demo
# Or use admin endpoint:
curl -X POST http://localhost:3001/api/properties/PROP004/verify
```

### Deposit Collateral & Borrow
1. Navigate to `/borrow`
2. Select your property
3. Enter collateral amount: `500` tokens
4. Approve in HashPack
5. Transaction confirmed
6. Enter borrow amount: `20000000` (20M heNGN)
7. Approve in HashPack
8. heNGN transferred to your wallet!

---

## 🔍 Debugging

### Check Wallet Connection Status

Open browser console (F12):

```javascript
// Should see these logs:
✅ HashPack extension detected
✅ Provider created from HashPack
✅ HashPack connected: 0.0.1234567
```

### Check Network

```bash
# Open HashPack wallet
Settings → Network → Should show "Testnet"
```

### Check Token Association

```bash
# In HashPack wallet
Tokens tab → Should see "TCRED" token listed
```

---

## 📁 Project Structure

```
ezyZip/
├── frontend/                    # Next.js frontend
│   ├── services/
│   │   └── wallets/            # ✨ New wallet implementation
│   │       ├── hashpackClient.tsx
│   │       ├── AllWalletsProvider.tsx
│   │       └── useWalletInterface.ts
│   ├── contexts/
│   │   └── WalletConnectContext.tsx  # State management
│   ├── components/
│   │   └── layout/Header.tsx   # Connect button
│   ├── app/
│   │   ├── layout.tsx          # Uses AllWalletsProvider
│   │   ├── tokenize/           # Property submission
│   │   └── borrow/             # Collateral & borrowing
│   └── hooks/
│       └── useContract.ts      # Smart contract interactions
├── backend/                     # Express + Hedera backend
│   └── src/
│       ├── services/
│       │   └── hedera.service.js  # Token minting
│       └── routes/             # API endpoints
└── contracts/                   # Solidity smart contracts
    └── src/
        └── LendingPool.sol
```

---

## 🎯 Key Files Modified

### ✅ Created Files
- `frontend/services/wallets/hashpackClient.tsx` - **DAppConnector implementation**
- `frontend/services/wallets/AllWalletsProvider.tsx` - Wrapper
- `frontend/services/wallets/walletInterface.ts` - Interface
- `frontend/services/wallets/useWalletInterface.ts` - Hook

### ✅ Updated Files
- `frontend/app/layout.tsx` - Uses AllWalletsProvider
- `frontend/components/layout/Header.tsx` - Simplified to HashPack-only
- `frontend/app/tokenize/page.tsx` - Removed wallet type checks
- `frontend/app/borrow/page.tsx` - Uses new context
- `frontend/hooks/useContract.ts` - Updated provider logic

### ✅ Removed Files
- `frontend/hooks/useWalletConnect.ts` - Broken implementation
- `frontend/contexts/MetamaskContext.tsx` - Not needed
- `frontend/store/wallet.ts` - Replaced by context

---

## 🐛 Common Issues

### 1. Modal doesn't open
**Fix:** Refresh page, ensure HashPack is logged in

### 2. "No signers found"
**Fix:** Disconnect and reconnect HashPack

### 3. Transaction fails
**Fix:** Check HBAR balance, ensure token is associated

### 4. Build errors
```bash
rm -rf frontend/.next frontend/node_modules
cd frontend && npm install && npm run dev
```

---

## 📝 How It Works

### Old (Broken) Implementation
```typescript
// ❌ This API doesn't exist
const hashpack = window.hashpack;
await hashpack.connectToLocalWallet();
```

### New (Working) Implementation
```typescript
// ✅ Official Hedera WalletConnect API
import { DAppConnector } from "@hashgraph/hedera-wallet-connect";

const dappConnector = new DAppConnector(...);
await dappConnector.init();
await dappConnector.openModal();  // Opens HashPack!

const signer = dappConnector.signers[0];
await transaction.freezeWithSigner(signer);
await transaction.executeWithSigner(signer);
```

---

## 🎉 Success Indicators

### ✅ Wallet Connected
- Header shows: `🦜 HashPack` with account ID
- Console: `✅ HashPack connected: 0.0.xxxxx`

### ✅ Property Submitted
- Alert: `✅ Property submitted successfully!`
- Redirected to `/properties/PROPxxx`

### ✅ Collateral Deposited
- Alert shows transaction hash
- Step changes to "Borrow"

### ✅ Loan Created
- Alert: `✅ Borrowed X heNGN!`
- Redirected to `/dashboard`

---

## 📚 Resources

- **HashPack:** https://www.hashpack.app/
- **Hedera Portal:** https://portal.hedera.com/
- **Hedera Docs:** https://docs.hedera.com/
- **WalletConnect:** https://cloud.walletconnect.com/

---

## 🆘 Need Help?

1. Check `WALLET_IMPLEMENTATION.md` for detailed docs
2. Check browser console for errors
3. Verify HashPack is on testnet
4. Ensure HBAR balance > 0
5. Try disconnecting and reconnecting

---

**Ready to test? Start with:** `npm run dev` 🚀
