# 🔑 Export Private Key from MetaMask

## ⚠️ **SAFETY FIRST**
- Only use for **TESTNET DEPLOYMENT**
- **NEVER** share mainnet private keys
- This is for Sepolia testnet only

## 📱 **Steps to Export Private Key**

### 1. **Open MetaMask**
- Click MetaMask extension
- Make sure you're on the **correct account**: `0x74439074A096c8C9519C499c47484347FA6857aA`

### 2. **Export Private Key**
- Click the **3 dots menu** next to your account
- Select **"Account details"**
- Click **"Export private key"**
- Enter your MetaMask password
- **Copy the private key** (starts with 0x...)

### 3. **Update Environment**
Once you have the private key, run:

```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
# Replace YOUR_PRIVATE_KEY with the actual key from MetaMask
sed -i '' 's/PRIVATE_KEY_DEPLOYER=.*/PRIVATE_KEY_DEPLOYER=YOUR_PRIVATE_KEY/' .env
```

### 4. **Deploy Contracts**
```bash
pnpm -C contracts deploy:sepolia
```

## 🎯 **What Will Happen**
- Deploy ExperienceFactory contract
- Deploy demo Experience contract  
- Set you as owner and platform wallet
- Configure token prices
- You'll receive all deployment transaction hashes

## 💰 **Your Benefits**
- **Platform fees**: 5% of all sales go to your wallet
- **Contract ownership**: Full control over settings
- **Creator fees**: 85% if you're also the creator

**Ready to deploy once you provide the private key! 🚀**
