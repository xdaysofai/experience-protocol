# 🚀 ETH-Only Experience Protocol - Deployment Guide

## Overview

This is a simplified version of the Experience Protocol that uses **only ETH** as payment currency, with a single wallet address managing all roles.

### Key Changes from Original:
- ✅ Removed all ERC-20 token dependencies
- ✅ Native ETH payments only  
- ✅ Single wallet for creator, platform, and flow sync authority
- ✅ Simplified contracts and frontend
- ✅ No token approvals needed

---

## 🔧 Configuration

### Single Wallet Address
**All roles**: `0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6`
- Creator (receives 85% of payments)
- Platform wallet (receives 5% of payments)
- Flow sync authority (can update CID and proposer)

### Payment Structure
- **Price**: 0.01 ETH per pass
- **Platform Fee**: 5% (to your wallet)
- **Proposer Fee**: 10% (when set, otherwise to creator)
- **Creator Fee**: 85% (remainder, to your wallet)

---

## 📦 Contract Architecture

### ExperienceETH.sol
Main contract for ETH-only soulbound passes:
```solidity
// Key functions:
- buyPasses(uint256 quantity) payable  // Buy with ETH
- setPrice(uint256 pricePerPass)       // Owner only
- setCid(string newCid)                // FlowSync only
- setCurrentProposer(address proposer) // FlowSync only
```

### ExperienceFactoryETH.sol
Factory for deploying new experiences:
```solidity
function createExperience(
    address creator,
    string calldata cidInitial,
    address flowSyncAuthority,
    uint16 proposerFeeBps,
    uint256 pricePerPass
) returns (address experience)
```

---

## 🚀 Deployment Steps

### 1. Compile Contracts
```bash
cd contracts
pnpm hardhat compile
```

### 2. Deploy to Sepolia
```bash
PRIVATE_KEY_DEPLOYER=<YOUR_PRIVATE_KEY> \
pnpm hardhat run scripts/deploy-eth-sepolia.js --network sepolia
```

### 3. Note Deployment Addresses
The script will output:
- Factory address
- Experience address  
- Frontend configuration variables

---

## 🌐 Frontend Usage

### Buy Page Route
`/experience/[address]/buy-eth`

### Features
- ETH balance display
- Simple quantity selection
- One-click purchase (no approvals)
- Real-time cost calculation
- Automatic payment splitting

### Frontend Configuration
Add to `apps/web/.env.local`:
```
NEXT_PUBLIC_FACTORY_ADDRESS_ETH=<factory_address>
NEXT_PUBLIC_EXPERIENCE_ADDRESS_ETH=<experience_address>
NEXT_PUBLIC_PRICE_PER_PASS_ETH=<price_in_wei>
```

---

## 🧪 Testing

### Run Acceptance Tests
```bash
cd contracts
node scripts/test-eth-acceptance.js
```

Tests verify:
- ✅ Contract deployment
- ✅ Single wallet configuration
- ✅ SBT non-transferability
- ✅ ETH payment splits
- ✅ Owner protection

### Build Frontend
```bash
cd apps/web
pnpm build
```

---

## 📋 Verification Checklist

- [ ] Contracts compile without errors
- [ ] Acceptance tests pass
- [ ] Frontend builds successfully
- [ ] All roles point to `0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6`
- [ ] Price set to 0.01 ETH
- [ ] Platform fee is 5%
- [ ] SBT transfers are disabled

---

## 🔄 Post-Deployment

### Test Purchase Flow
1. Connect wallet to Sepolia
2. Visit `/experience/[address]/buy-eth`
3. Set quantity and purchase
4. Verify payment splits in transaction

### Update CID via Relayer
```bash
curl -H 'content-type: application/json' \
-d '{"experience":"<address>","newCid":"new-content-id","proposer":"0x0000000000000000000000000000000000000000"}' \
localhost:4000/sync-accepted
```

---

## 💡 Benefits of ETH-Only Version

1. **Simpler UX**: No token approvals needed
2. **Lower Gas**: Fewer transactions per purchase
3. **Universal**: ETH is always available
4. **Cleaner Code**: Reduced complexity
5. **Single Wallet**: Easy management

**Your ETH-only Experience Protocol is ready! 🎉**
