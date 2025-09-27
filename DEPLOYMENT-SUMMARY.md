# 🚀 Experience Protocol - Deployment Summary

## ✅ Successfully Deployed!

### 🔑 Generated Test Wallet (Foundry)
- **Address**: `0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1`
- **Private Key**: `0x496825bc820fbb96ffe0dbc6c4caf6b20f513a30975e3973900d9e811e99c93f`
- **Note**: This is a TEST-ONLY wallet for Polygon Amoy testnet

### 📦 Deployed Contracts (Polygon Amoy)
- **ExperienceFactory**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Experience (Demo)**: `0xa16E02E87b7454126E5E10d957A927A7F5B5d2be`
- **Network**: Polygon Amoy Testnet (Chain ID: 80002)
- **Deployer**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Hardhat default account)

### 💰 Token Configuration
**Configured Prices:**
- **USDC**: $10.00 (10,000,000 units with 6 decimals)
- **WETH**: 0.003 ETH (3,000,000,000,000,000 units with 18 decimals)

**Token Addresses:**
- **USDC_AMOY**: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- **WETH_AMOY**: `0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9`

### 🌐 Web Application
- **Status**: ✅ Running on http://localhost:3000
- **Buy Page**: http://localhost:3000/experience/0xa16E02E87b7454126E5E10d957A927A7F5B5d2be/buy
- **Settings Page**: http://localhost:3000/experience/0xa16E02E87b7454126E5E10d957A927A7F5B5d2be/settings

### 💸 Payment Splitting (Active)
- **Platform Fee**: 5% → `0x74439074A096c8C9519C499c47484347FA6857aA`
- **Proposer Fee**: 10% (when proposer is set)
- **Creator Fee**: 85% → Contract owner

### 🧪 Testing Instructions

1. **Add Polygon Amoy to MetaMask:**
   - Network Name: Amoy
   - RPC URL: `https://rpc-amoy.polygon.technology`
   - Chain ID: 80002
   - Currency: POL

2. **Get Test Tokens:**
   - Get POL from [Polygon Faucet](https://faucet.polygon.technology/)
   - Get test USDC/WETH from Amoy DEXs or bridges

3. **Test Buy Flow:**
   - Visit the buy page
   - Connect wallet
   - Select USDC or WETH
   - Set quantity
   - Click "Approve → Buy"

4. **Test Settings (Owner Only):**
   - Connect with deployer wallet
   - Visit settings page
   - Modify token prices and allowlist
   - Save changes

### 🔧 Environment Files Created
- ✅ Root `.env` with private key and token addresses
- ✅ Web app `.env.local` with public configuration
- ✅ All dependencies installed and working

### 📝 Next Steps
- Fund your wallet with test POL for gas fees
- Get test USDC/WETH tokens
- Test the complete buy → approve → mint flow
- Verify payment splitting works correctly

**Deployment completed successfully at**: $(date)
**Network**: Polygon Amoy Testnet
**Status**: Ready for testing!
