# 🦊 Deploy Experience Protocol with Your MetaMask

## 🎯 **Your Setup**
- **Your MetaMask Address**: `0x74439074A096c8C9519C499c47484347FA6857aA`
- **Role**: Platform wallet (receives 5% fees) + Deployer
- **Current Balance**: 0 ETH on Sepolia testnet

## 🚀 **Quick Deployment Steps**

### 1. **Get Sepolia ETH for Your MetaMask**

Visit these faucets with your address `0x74439074A096c8C9519C499c47484347FA6857aA`:

- **🔗 Chainlink Faucet**: https://faucets.chain.link/
- **🔗 Alchemy Faucet**: https://sepoliafaucet.com/
- **🔗 Infura Faucet**: https://www.infura.io/faucet/sepolia

### 2. **Add Sepolia Network to MetaMask** 

```
Network Name: Sepolia
RPC URL: https://ethereum-sepolia-rpc.publicnode.com
Chain ID: 11155111
Currency: ETH
Block Explorer: https://sepolia.etherscan.io/
```

### 3. **Option A: Use Your MetaMask Private Key** (Quick)

**⚠️ CAUTION**: Only for testing! Never use mainnet keys.

1. Export private key from MetaMask (Account Details → Export Private Key)
2. Update `.env`:
```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
# Replace the PRIVATE_KEY_DEPLOYER with your MetaMask private key
sed -i '' 's/PRIVATE_KEY_DEPLOYER=.*/PRIVATE_KEY_DEPLOYER=0xYourMetaMaskPrivateKey/' .env
```

3. Deploy:
```bash
pnpm -C contracts deploy:sepolia
```

### 4. **Option B: Manual Deployment** (Safer)

Use Remix IDE with MetaMask connection:

1. Go to https://remix.ethereum.org/
2. Upload your contract files
3. Connect MetaMask to Sepolia
4. Deploy directly through Remix

## 🔄 **Check Your Balance First**

```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
source ~/.zshenv
cast balance 0x74439074A096c8C9519C499c47484347FA6857aA --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

## 💰 **After Deployment**

You'll receive:
- **5% platform fees** from all purchases (goes to your MetaMask)
- **Contract ownership** (can set token prices and manage settings)

## 🎨 **Update Web App Config**

After successful deployment, update `apps/web/.env.local`:

```bash
# Update with your deployed addresses
NEXT_PUBLIC_CHAIN_ID_ETHEREUM_SEPOLIA=11155111
NEXT_PUBLIC_FACTORY_ADDRESS=0xYourFactoryAddress
NEXT_PUBLIC_EXPERIENCE_ADDRESS=0xYourExperienceAddress
```

## 🧪 **Test the Flow**

1. Visit: http://localhost:3000/experience/[YOUR_EXPERIENCE_ADDRESS]/buy
2. Connect your MetaMask
3. Try buying with test tokens
4. Verify you receive the 5% platform fee

**Your MetaMask is already perfectly configured as the platform wallet! 🎉**
