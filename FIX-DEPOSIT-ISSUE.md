# Fix Deposit Collateral Issue

## What's Wrong?

The deposit collateral transaction is failing with error `(BUG) body.data was not set in the protobuf`, which **masks the real error**.

After thorough investigation, I found **3 critical issues**:

### 1. ⚠️ Token ID Mismatch (FIXED ✓)
- Your `frontend/.env.local` had an **old token ID** (0.0.7119378)
- This has been updated to match the new token (0.0.7162666)
- All config files now use the same token ID

### 2. 🔴 Property Token Not Whitelisted
**This is likely your main issue!**

When you tokenize a property, it creates a NEW token (e.g., 0.0.XXXXXX). Each property gets its own unique token ID. However, the LendingPool contract only accepts tokens that are **explicitly whitelisted**.

During deployment, only the Master RWA token gets auto-whitelisted. Your property token is NOT in the whitelist, so the contract rejects it with `TokenNotSupported` error (which is hidden by the protobuf error).

### 3. ⚠️ Missing Token Associations
The property token may not be associated with:
- Your account (needed to hold/transfer tokens)
- The lending pool contract (needed to receive tokens)

---

## How to Fix It

### Step 1: Run the Diagnostic Script

First, identify exactly what's wrong:

```bash
node diagnose-deposit-issue.js
```

This will check:
- ✓ Your token balances
- ✓ Token associations (you + lending pool)
- ✓ Which tokens are whitelisted in the contract
- ✓ Configuration consistency

**Follow the prompts** and enter your HashPack account ID when asked.

---

### Step 2: Fix the Issues

Based on the diagnostic output, run the appropriate fix:

#### Issue A: Token Not Associated With Your Account

**Symptom:** Diagnostic shows you don't have the property token

**Fix:** Associate the token in HashPack
1. Open HashPack wallet
2. Go to "Tokens" tab
3. Click "Associate Token"
4. Enter the property token ID (shown in the diagnostic output)
5. Confirm the association

---

#### Issue B: Token Not Associated With Lending Pool

**Symptom:** Diagnostic shows the lending pool doesn't have the property token associated

**Fix:** Send 1 token to trigger auto-association
```bash
node send-token-to-pool.js 0.0.XXXXXX
```
Replace `0.0.XXXXXX` with your property token ID.

---

#### Issue C: Token Not Whitelisted in Contract ⚠️ MOST LIKELY

**Symptom:** Diagnostic shows token is not in `supportedTokens` mapping

**Fix:** Whitelist the property token
```bash
node whitelist-token.js 0.0.XXXXXX
```
Replace `0.0.XXXXXX` with your property token ID.

**Note:** This requires you to be the contract owner (deployer account).

---

### Step 3: Restart Frontend

After fixing the issues:

```bash
cd frontend
# Press Ctrl+C to stop if running
npm run dev
```

---

### Step 4: Try Deposit Again

1. Go to http://localhost:3000
2. Connect your wallet
3. Navigate to Borrow page
4. Select your property
5. Enter amount and try to deposit

The transaction should now succeed!

---

## Understanding the Flow

Here's what happens during a deposit:

```
1. User tokenizes property
   → Creates NEW token (e.g., 0.0.7162888)
   → User receives tokens

2. User deposits collateral
   → Frontend calls approveToken() ✓
   → Frontend calls depositCollateral()
   → Contract checks: supportedTokens[token] ❌ NOT WHITELISTED!
   → Contract reverts with TokenNotSupported
   → HashConnect masks this with protobuf error

3. After whitelisting
   → Frontend calls approveToken() ✓
   → Frontend calls depositCollateral()
   → Contract checks: supportedTokens[token] ✓ WHITELISTED!
   → Contract calls transferFrom() ✓
   → Tokens transferred successfully! 🎉
```

---

## Quick Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `diagnose-deposit-issue.js` | Check everything | `node diagnose-deposit-issue.js` |
| `whitelist-token.js` | Add token to contract whitelist | `node whitelist-token.js 0.0.XXXXXX` |
| `send-token-to-pool.js` | Associate token with pool | `node send-token-to-pool.js 0.0.XXXXXX` |

---

## Still Having Issues?

1. **Check the transaction on HashScan:**
   - Go to https://hashscan.io/testnet
   - Search for the transaction ID from the error message
   - Look for the actual error status

2. **Verify you're using the correct token:**
   - Go to your "Properties" page
   - Check the token ID for your property
   - Use that exact token ID in the scripts

3. **Make sure you have HBAR for gas:**
   - You need ~0.5 HBAR for transaction fees
   - Check your balance: https://hashscan.io/testnet/account/YOUR_ACCOUNT_ID

4. **Check approval was successful:**
   - The frontend shows "Step 1/2: Requesting token approval"
   - You must approve this in your wallet
   - Wait 5-10 seconds after approval before deposit

---

## Configuration Files Fixed

✅ **frontend/.env.local**
- Updated MASTER_RWA_TOKEN_ID from 0.0.7119378 → 0.0.7162666
- Updated MASTER_RWA_TOKEN_ADDRESS to match

✅ **All configs now synchronized:**
- `contracts/.env`: 0.0.7162666 ✓
- `frontend/constants/index.ts`: 0.0.7162666 ✓
- `frontend/.env.local`: 0.0.7162666 ✓

---

## Need Help?

If you're still stuck after running the diagnostic:

1. Share the output of `node diagnose-deposit-issue.js`
2. Share the property token ID you're trying to deposit
3. Share the transaction ID from the error message

I can help debug further!
