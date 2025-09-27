# 🚀 Deploy with New Wallet

## ✅ **Updated Configuration**
- **New Wallet**: `0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6`
- **Private Key**: ✅ Updated in `.env`
- **Platform Wallet**: ✅ Set to new address (you get 5% fees)

## 🚰 **Step 1: Get Sepolia ETH**

Your new wallet needs Sepolia ETH for deployment. Visit these faucets:

### **🔗 Quick Faucets:**
1. **Alchemy Sepolia Faucet**: https://sepoliafaucet.com/
   - Enter: `0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6`
   - Get 0.5 ETH instantly

2. **Chainlink Faucet**: https://faucets.chain.link/sepolia
   - Connect wallet or enter address
   - Get 0.1 ETH

3. **Infura Faucet**: https://www.infura.io/faucet/sepolia
   - Enter address and request ETH

## 🚀 **Step 2: Deploy (Once Funded)**

Check balance first:
```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
source ~/.zshenv
cast balance 0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6 --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

Deploy contracts:
```bash
pnpm -C contracts deploy:sepolia
```

## ⚡ **Quick Deploy Script**

I've created a script that will check balance and deploy:
```bash
./deploy.sh
```

## 🎯 **After Deployment**

1. **Copy contract addresses** from deployment output
2. **Update web app:**
   ```bash
   # Replace with actual deployed addresses
   sed -i '' 's/NEXT_PUBLIC_FACTORY_ADDRESS=/NEXT_PUBLIC_FACTORY_ADDRESS=0xYourFactoryAddress/' apps/web/.env.local
   ```

3. **Configure prices:**
   ```bash
   EXPERIENCE=0xYourExperienceAddress pnpm -C contracts cfg:set-prices:sepolia
   ```

4. **Test:**
   ```bash
   pnpm dev:web
   ```

## 💰 **Your Benefits**
- **5% platform fees** → `0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6`
- **Contract ownership** and full control
- **Working Experience Protocol** on Sepolia testnet

**Just get Sepolia ETH from any faucet above, then run the deploy! 🎉**
