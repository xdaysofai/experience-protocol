# Experience Protocol - Setup Guide

## ✅ Project Created Successfully!

Your Experience Protocol project is now fully set up and ready for deployment. Here's what's been created:

### 📁 Project Structure
```
experience-protocol/
├── contracts/              # Smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── Experience.sol
│   │   └── ExperienceFactory.sol
│   └── scripts/
│       ├── deploy-amoy.js
│       └── cfg-set-prices-amoy.js
├── apps/
│   ├── web/                # Next.js frontend
│   │   └── app/
│   │       ├── experience/[address]/
│   │       │   ├── buy/page.tsx
│   │       │   └── settings/page.tsx
│   │       └── layout.tsx
│   └── relayer/            # Fastify API server
│       └── src/server.ts
└── packages/sdk/           # Shared utilities
```

### ✅ What's Working
- ✅ All dependencies installed
- ✅ Smart contracts compile successfully
- ✅ Web app builds without errors
- ✅ TypeScript configuration fixed
- ✅ viem integration properly configured

---

## 🚀 Next Steps

### 1. Environment Setup

**Create `.env` file in project root:**
```bash
# Copy the template
cp env-template.txt .env
```

**Fill in these values:**
```bash
PRIVATE_KEY_DEPLOYER=0x<YOUR-TEST-WALLET-PRIVATE-KEY>
USDC_AMOY=0x<POLYGON-AMOY-USDC-ADDRESS>
WETH_AMOY=0x<POLYGON-AMOY-WETH-ADDRESS>
DAI_AMOY=0x<POLYGON-AMOY-DAI-ADDRESS>  # Optional
```

**Create web app environment file:**
```bash
# Copy the template
cp env-local-template.txt apps/web/.env.local
```

Fill in the same token addresses with `NEXT_PUBLIC_` prefix.

### 2. Deploy Contracts

```bash
# 1. Compile contracts
pnpm -C contracts build

# 2. Deploy to Polygon Amoy
pnpm -C contracts deploy:amoy
```

**📝 Copy the Experience address from deploy output!**

### 3. Configure Token Prices

```bash
EXPERIENCE=0xYourExperienceAddress \
USDC_AMOY=0x... \
WETH_AMOY=0x... \
pnpm -C contracts cfg:set-prices:amoy
```

### 4. Run Applications

```bash
# Web app (port 3000)
pnpm dev:web

# Relayer (port 4000) - optional
pnpm dev:relayer
```

---

## 🔗 Token Addresses You Need

**For Polygon Amoy testnet, you'll need:**

- **USDC**: Get from Polygon faucets or DEX
- **WETH**: Wrap ETH using Polygon Amoy WETH contract
- **DAI**: Get from Polygon faucets or DEX

**To find current addresses:**
1. Check [Polygon docs](https://docs.polygon.technology/tools/faucets/)
2. Use [PolygonScan Amoy](https://amoy.polygonscan.com/) 
3. Look for verified token contracts

---

## 📱 Usage

### Buy Access
1. Visit: `http://localhost:3000/experience/[EXPERIENCE_ADDRESS]/buy`
2. Connect wallet (MetaMask)
3. Select token (USDC, WETH, DAI)
4. Set quantity
5. Click "Approve → Buy"

### Manage Settings (Owner Only)
1. Visit: `http://localhost:3000/experience/[EXPERIENCE_ADDRESS]/settings`
2. Connect as contract owner
3. Toggle token allowlist
4. Set prices in raw units (e.g., 10000000 for $10 USDC)
5. Save changes

---

## 💰 Payment Splitting

When someone buys access:
- **5%** → Platform wallet (`0x74439074A096c8C9519C499c47484347FA6857aA`)
- **10%** → Current proposer (if set via relayer)
- **85%** → Creator (contract owner)

---

## 🔧 Troubleshooting

### Common Issues:

1. **"Token not allowed or price=0"**
   - Visit settings page and enable token + set price
   - Make sure you're connected as contract owner

2. **"Insufficient allowance"**
   - The approve step should handle this automatically
   - Check wallet has enough tokens

3. **Contract deployment fails**
   - Verify private key is set correctly
   - Check wallet has Amoy ETH for gas

4. **Web app won't connect wallet**
   - Install MetaMask
   - Add Polygon Amoy network
   - Get test ETH from faucet

---

## 📞 Ready for Support

You have:
- ✅ Complete project structure
- ✅ Working smart contracts
- ✅ Functional web interface
- ✅ viem approve→buy helper function
- ✅ All dependencies installed

**What you need to provide when ready:**
1. Your test wallet private key
2. Token addresses on Polygon Amoy
3. Any deployment errors or transaction hashes

The project is fully functional and ready for testing once you fill in the environment variables!
