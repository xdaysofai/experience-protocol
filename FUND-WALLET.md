# 💰 Fund Test Wallet for Deployment

## Generated Test Wallet
**Address**: `0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1`
**Private Key**: `0x496825bc820fbb96ffe0dbc6c4caf6b20f513a30975e3973900d9e811e99c93f`

## Steps to Fund and Deploy

### 1. Get Test POL from Faucet
Visit: **https://faucet.polygon.technology/**

1. Connect your MetaMask to Polygon Amoy
2. Request POL for address: `0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1`
3. Wait for tokens to arrive

### 2. Check Balance
```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
source ~/.zshenv
cast balance 0x6399FB0e50F8dF5f60fC33D84a5bCC90577118c1 --rpc-url https://rpc-amoy.polygon.technology
```

### 3. Deploy to Amoy (once funded)
```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
pnpm -C contracts run scripts/deploy-amoy.js --network amoy
```

### 4. Alternative: Deploy with Explicit Network
```bash
cd "/Users/niteshsingh/Desktop/Experience Protocol"
cd contracts
npx hardhat run scripts/deploy-amoy.js --network amoy
```

## Polygon Amoy Network Details
- **Chain ID**: 80002
- **RPC URL**: https://rpc-amoy.polygon.technology
- **Currency**: POL
- **Explorer**: https://amoy.polygonscan.com/

## Current Issue
The previous deployment went to a local Hardhat network instead of Amoy, which is why the contract address `0xa16E02E87b7454126E5E10d957A927A7F5B5d2be` returns no code when checked on Amoy.
