# Quick Update Checklist After Redeployment

After deploying new contracts, update these **3 files**:

## 1. Frontend Constants ✏️
**File**: `frontend/constants/index.ts`
**Lines**: 11-14

```typescript
LENDING_POOL_ADDRESS: '0xYOUR_NEW_EVM_ADDRESS',
LENDING_POOL_ID: '0.0.YOUR_NEW_ID',
ORACLE_ADDRESS: '0xYOUR_NEW_ORACLE_ADDRESS',
ORACLE_ID: '0.0.YOUR_NEW_ORACLE_ID',
```

## 2. Contracts Environment ✏️
**File**: `contracts/.env`
**Lines**: 24-25

```bash
ORACLE_ADDRESS=0xYOUR_NEW_ORACLE_ADDRESS
LENDING_POOL_ADDRESS=0xYOUR_NEW_LENDING_POOL_ADDRESS
```

## 3. Backend Environment (if applicable) ✏️
**File**: `backend/.env`
Search for any references to:
- `LENDING_POOL_ADDRESS`
- `ORACLE_ADDRESS`

---

## Quick Deploy Command

```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript --rpc-url $HEDERA_RPC_URL --broadcast
```

## Who Deployed?

**Deployer Account**: 0.0.7095129 (from contracts/.env)

This account will be the owner of the newly deployed contracts.

---

## After Updating, Restart:

```bash
# Terminal 1 - Frontend
cd frontend && npm run dev

# Terminal 2 - Backend
cd backend && npm run dev
```
