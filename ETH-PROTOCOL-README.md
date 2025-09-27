# 🚀 ETH-Only Experience Protocol

Complete implementation of token-gated access protocol using **native ETH payments only**.

## 📋 Implementation Summary

### ✅ **Architecture Complete**
- **Contracts**: `Experience.sol` (ETH-only SBT) + `ExperienceFactory.sol`
- **Frontend**: Next.js with `/buy`, `/settings`, `/proposals` pages
- **Backend**: Fastify relayer with proposal CRUD + sync endpoints
- **Testing**: Hardhat test suite with split math validation
- **Deployment**: Sepolia-ready scripts

### ✅ **Single Wallet Configuration**
- **Address**: `0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6`
- **Roles**: Creator + Platform + FlowSyncAuthority
- **Split**: 5% platform, 10% proposer (when set), 85% creator

### ✅ **Key Features**
- **Native ETH**: No ERC-20 dependencies, no approvals needed
- **SBT**: ERC-1155 non-transferable passes (id=1)
- **Auto-split**: Payments automatically distributed on purchase
- **EIP-6963**: Wallet discovery for multi-provider compatibility
- **Proposals**: Community governance with voting system

---

## 🔧 **Environment Setup**

### Root `.env`
```bash
PRIVATE_KEY_DEPLOYER=0x<YOUR_PRIVATE_KEY>
RPC_ETHEREUM_SEPOLIA=https://rpc.sepolia.org
PLATFORM_WALLET=0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6
PLATFORM_FEE_BPS=500
DEV_BYPASS_X402=true
DRY_RUN=false
```

### `apps/web/.env.local`
```bash
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_FACTORY_ADDRESS=<AFTER_DEPLOYMENT>
NEXT_PUBLIC_PLATFORM_FEE_BPS=500
NEXT_PUBLIC_RPC=https://rpc.sepolia.org
NEXT_PUBLIC_RELAYER_URL=http://localhost:4000
```

---

## 🚀 **Deployment Commands**

### 1. Install Dependencies
```bash
pnpm i
```

### 2. Compile Contracts
```bash
pnpm -C contracts build
```

### 3. Deploy to Sepolia
```bash
pnpm -C contracts run deploy:sepolia
# Copy EXPERIENCE address from output
```

### 4. Configure Price (Optional)
```bash
EXPERIENCE=0x... PRICE_ETH_WEI=10000000000000000 pnpm -C contracts run cfg:set-price:sepolia
```

### 5. Start Services
```bash
# Terminal 1: Relayer
pnpm -C apps/relayer dev

# Terminal 2: Web App
pnpm -C apps/web dev
```

### 6. Run Acceptance Tests
```bash
pnpm tsx tools/acceptance.ts
```

---

## 📊 **File Structure Overview**

```
├── contracts/
│   ├── contracts/
│   │   ├── Experience.sol          # ETH-only SBT contract
│   │   └── ExperienceFactory.sol   # Factory deployment
│   ├── scripts/
│   │   ├── deploy-sepolia.js       # Main deployment
│   │   └── cfg-set-price-sepolia.js # Price configuration
│   └── test/
│       └── Experience.test.js      # Contract test suite
├── apps/
│   ├── web/
│   │   ├── app/experience/[address]/
│   │   │   ├── buy/page.tsx        # ETH purchase page
│   │   │   ├── settings/page.tsx   # Owner price control
│   │   │   └── proposals/page.tsx  # Community governance
│   │   ├── abi/Experience.json     # Contract ABI
│   │   └── lib/provider.ts         # EIP-6963 wallet discovery
│   └── relayer/
│       └── src/server.ts           # Fastify backend
├── packages/sdk/
│   └── src/identity.ts             # Mock Self verification
└── tools/
    └── acceptance.ts               # Full test suite
```

---

## 🎯 **Contract Addresses (After Deployment)**

Update these after running deployment:

- **Factory**: `<FACTORY_ADDRESS>`
- **Experience**: `<EXPERIENCE_ADDRESS>`  
- **Network**: Ethereum Sepolia
- **Price**: 0.01 ETH per pass

---

## 🧪 **Testing & Validation**

### Smart Contracts
```bash
cd contracts && pnpm hardhat test
```
✅ **5% platform / 95% creator split math verified**  
✅ **SBT transfers disabled**  
✅ **Owner-only guards working**  

### Acceptance Suite
```bash
pnpm tsx tools/acceptance.ts
```
✅ **Contract immutables match config**  
✅ **Relayer endpoints functional**  
✅ **Web pages build successfully**  

### Manual Testing
1. **Visit**: `http://localhost:3000/experience/<EXPERIENCE_ADDRESS>/buy`
2. **Connect**: MetaMask to Sepolia
3. **Purchase**: Set quantity, buy with ETH
4. **Verify**: Transaction on Etherscan, SBT balance

---

## 💻 **Frontend Pages**

### `/experience/[address]/buy`
- **Connect wallet** (EIP-6963 discovery)
- **View price** and payment splits
- **Purchase passes** with native ETH
- **Real-time cost** calculation

### `/experience/[address]/settings` 
- **Owner check** (read-only for others)
- **Set price** in ETH (owner only)
- **View current** CID and proposer

### `/experience/[address]/proposals`
- **Create proposals** (any user)
- **Vote up/down** (any user, once per proposal)
- **Accept proposals** (owner only)
- **Updates CID** via relayer sync

---

## 🔄 **Relayer API**

### Core Endpoints
- `GET /health` → `{ok: true}`
- `POST /proposals` → Create proposal
- `GET /proposals?experience=0x...` → List proposals
- `POST /proposals/:id/vote` → Vote on proposal
- `POST /proposals/:id/accept` → Accept & sync to chain
- `POST /sync-accepted` → Update CID + proposer

### Testing
```bash
curl -s localhost:4000/health
curl -s localhost:4000/proposals
```

---

## 🎉 **Deployment Checklist**

- [ ] `.env` files configured with your private key
- [ ] Contracts compiled successfully
- [ ] Sepolia deployment completed
- [ ] Factory and Experience addresses noted
- [ ] Web app builds without errors
- [ ] Relayer starts and responds to `/health`
- [ ] Acceptance tests pass
- [ ] Manual purchase flow tested

**Your ETH-only Experience Protocol is ready for use! 🚀**

---

## 🔍 **Key Differences from Original**

### ✅ **Simplified**
- **Removed**: All ERC-20 token support
- **Removed**: Token allowlists and approvals  
- **Removed**: Multi-token pricing
- **Added**: Direct ETH payments
- **Added**: Single wallet for all roles

### ✅ **Enhanced**
- **EIP-6963**: Proper wallet discovery
- **Auto-split**: No manual distribution needed
- **Cleaner UX**: One-click purchases
- **Lower gas**: Fewer transactions per buy
- **Universal**: ETH always available

This implementation provides a production-ready foundation for ETH-based token-gated access with automated payment splitting.
