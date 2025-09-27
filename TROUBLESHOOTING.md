# 🔧 Troubleshooting Guide

## Current Issues & Solutions

### 1. Contract Function Error: "allowedToken" returned no data

**Problem**: `ContractFunctionExecutionError: The contract function "allowedToken" returned no data ("0x").`

**Root Cause**: The contract was deployed to local Hardhat network instead of Polygon Amoy.

**Solution**: 
1. Fund the test wallet with POL tokens
2. Redeploy to Amoy with correct network specification

**Steps**:
```bash
# 1. Fund wallet at: https://faucet.polygon.technology/
# Address: 0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1

# 2. Check balance
cast balance 0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1 --rpc-url https://rpc-amoy.polygon.technology

# 3. Deploy to Amoy (once funded)
cd "/Users/niteshsingh/Desktop/Experience Protocol"
pnpm -C contracts deploy:amoy
```

### 2. MetaMask Connection Issue

**Problem**: Wallet should prompt MetaMask but doesn't always work smoothly.

**Solution**: ✅ **FIXED** - Added explicit connect wallet button with better UX:
- Clear "Connect MetaMask Wallet" button
- Connected wallet status display  
- Proper error handling and user feedback
- Disabled buy button until wallet connected

### 3. Token Address Configuration

**Problem**: Using placeholder addresses instead of real testnet tokens.

**Current Addresses** (may need verification):
- USDC_AMOY: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- WETH_AMOY: `0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9`

**Solution**: Verify these are correct Amoy testnet addresses or get tokens from faucets.

## Quick Fix Summary

### ✅ Fixed Issues:
1. **MetaMask Connection**: Added proper connect button and UX
2. **Error Handling**: Added try/catch for contract calls
3. **UI Feedback**: Better status messages and error display
4. **Deploy Script**: Fixed to use `--network amoy` flag

### 🔄 Pending (Need User Action):
1. **Fund Wallet**: Get POL from faucet for `0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1`
2. **Redeploy**: Once funded, redeploy contracts to actual Amoy network
3. **Test Tokens**: Get test USDC/WETH for testing buy flow

## Test Flow After Fixes

1. Visit: http://localhost:3000/experience/[NEW_CONTRACT_ADDRESS]/buy
2. Click "Connect MetaMask Wallet" → Should prompt MetaMask
3. Approve connection → Should show connected status
4. Select token → Should load price (once contract deployed properly)  
5. Set quantity → Should calculate total
6. Click "Approve → Buy" → Should trigger MetaMask for approval + buy

## Network Configuration for MetaMask

```
Network Name: Polygon Amoy
RPC URL: https://rpc-amoy.polygon.technology
Chain ID: 80002
Currency Symbol: POL
Block Explorer: https://amoy.polygonscan.com/
```

The main blocker is funding the wallet and redeploying to the correct network.
