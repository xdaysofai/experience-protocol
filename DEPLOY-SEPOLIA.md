# 🚀 Deploy to Ethereum Sepolia Testnet

## ✅ **YES! You can deploy to Ethereum testnets**

Your project is already configured for Ethereum Sepolia. It's often easier than Polygon Amoy since:
- ✅ More reliable RPC endpoints
- ✅ Better established faucets
- ✅ More testnet token availability
- ✅ Better block explorer support

## 📋 **Step-by-Step Deployment**

### 1. **Get Sepolia ETH (Free)**

**Your wallet address**: `0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1`

**Available Faucets**:
- **Chainlink Faucet**: https://faucets.chain.link/ (Recommended)
- **Alchemy Faucet**: https://sepoliafaucet.com/
- **Infura Faucet**: https://www.infura.io/faucet/sepolia
- **Google Cloud Faucet**: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### 2. **Check Balance**
```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
source ~/.zshenv
cast balance 0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1 --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

### 3. **Deploy to Sepolia**
```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
pnpm -C contracts deploy:sepolia
```

### 4. **Configure Token Prices**
```bash
# After deployment, copy the Experience address and run:
EXPERIENCE=0xYourExperienceAddress pnpm -C contracts cfg:set-prices:sepolia
```

## 🪙 **Sepolia Testnet Token Addresses**

Add these to your `.env` file:

```bash
# Common Sepolia testnet tokens:
USDC_SEPOLIA=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8  # Aave USDC
WETH_SEPOLIA=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14  # Wrapped ETH
DAI_SEPOLIA=0x68194a729C2450ad26072b3D33ADaCbcef39D574   # MakerDAO DAI
```

## 🔧 **Network Configuration**

**For MetaMask**:
- **Network Name**: Sepolia
- **RPC URL**: `https://ethereum-sepolia-rpc.publicnode.com`
- **Chain ID**: 11155111
- **Currency**: ETH
- **Block Explorer**: `https://sepolia.etherscan.io/`

## 📱 **Update Web App Config**

After deployment, update `apps/web/.env.local`:

```bash
NEXT_PUBLIC_CHAIN_ID_ETHEREUM_SEPOLIA=11155111
NEXT_PUBLIC_FACTORY_ADDRESS=0xYourFactoryAddress
NEXT_PUBLIC_USDC_SEPOLIA=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
NEXT_PUBLIC_WETH_SEPOLIA=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
NEXT_PUBLIC_DAI_SEPOLIA=0x68194a729C2450ad26072b3D33ADaCbcef39D574
```

## 🎯 **Why Sepolia is Better Choice**

1. **Reliability**: More stable RPC endpoints
2. **Faucets**: Multiple reliable ETH faucets  
3. **Tokens**: Established testnet tokens available
4. **Explorer**: Better Etherscan support
5. **Community**: More widely used for testing

## 🚦 **Quick Commands**

```bash
# Get ETH balance
cast balance 0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1 --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Deploy contracts
pnpm -C contracts deploy:sepolia

# Configure prices (replace EXPERIENCE address)
EXPERIENCE=0xYourAddress pnpm -C contracts cfg:set-prices:sepolia

# Start web app
pnpm dev:web
```

**Sepolia is the recommended choice for testing!** 🎉
