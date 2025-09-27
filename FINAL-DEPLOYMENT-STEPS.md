# 🚀 Final Deployment Steps

## ✅ **Ready to Deploy!**

**Your Address**: `0x74439074A096c8C9519C499c47484347FA6857aA`
**Sepolia Balance**: ✅ `0.282 ETH` (sufficient for deployment)
**Platform Wallet**: ✅ Set to your address (you get 5% fees!)

## 🔑 **Step 1: Get Your Private Key**

1. **Open MetaMask**
2. **Click the 3 dots** next to your account name
3. **Select "Account details"**
4. **Click "Export private key"**
5. **Enter your MetaMask password**
6. **Copy the private key** (starts with `0x...`)

## ⚙️ **Step 2: Update Environment**

Run this command (replace `YOUR_PRIVATE_KEY` with the actual key):

```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
sed -i '' 's/PRIVATE_KEY_DEPLOYER=.*/PRIVATE_KEY_DEPLOYER=YOUR_PRIVATE_KEY/' .env
```

## 🚀 **Step 3: Deploy**

**Option A - Use the deployment script:**
```bash
./deploy.sh
```

**Option B - Manual deployment:**
```bash
pnpm -C contracts deploy:sepolia
```

## 🎯 **Step 4: After Deployment**

1. **Copy the contract addresses** from the deployment output
2. **Update web app config:**
   ```bash
   # Replace with your actual addresses
   sed -i '' 's/NEXT_PUBLIC_FACTORY_ADDRESS=/NEXT_PUBLIC_FACTORY_ADDRESS=0xYourFactoryAddress/' apps/web/.env.local
   ```

3. **Configure token prices:**
   ```bash
   EXPERIENCE=0xYourExperienceAddress pnpm -C contracts cfg:set-prices:sepolia
   ```

4. **Test the web app:**
   ```bash
   pnpm dev:web
   ```

## 💰 **What You'll Get**

- **5% platform fees** from every purchase → Your MetaMask
- **Full ownership** of deployed contracts
- **Settings control** via web interface
- **Working buy/sell flow** on Sepolia testnet

## 🔗 **After Deployment URLs**

- **Factory**: `https://sepolia.etherscan.io/address/[FACTORY_ADDRESS]`
- **Experience**: `https://sepolia.etherscan.io/address/[EXPERIENCE_ADDRESS]`
- **Buy Page**: `http://localhost:3000/experience/[EXPERIENCE_ADDRESS]/buy`
- **Settings**: `http://localhost:3000/experience/[EXPERIENCE_ADDRESS]/settings`

**You're all set! Just need to export your private key and deploy! 🎉**
