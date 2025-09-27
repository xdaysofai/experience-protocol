# Experience Protocol

A token-gated access protocol built on ERC-1155 "passes" (Soulbound Tokens) with payment splitting functionality.

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm i
```

### 2. Environment Configuration

Copy and fill the environment files:

**Root `.env` (required for contracts and relayer):**
```bash
cp .env.template .env
```

Fill in:
- `PRIVATE_KEY_DEPLOYER=0x<TEST-ONLY-KEY>` - Your test wallet private key
- `USDC_AMOY=0x...` - USDC token address on Polygon Amoy
- `WETH_AMOY=0x...` - WETH token address on Polygon Amoy  
- `DAI_AMOY=0x...` - DAI token address on Polygon Amoy (optional)

**Web app `.env.local`:**
```bash
cp apps/web/.env.local.template apps/web/.env.local
```

Fill in the same token addresses with `NEXT_PUBLIC_` prefix.

### 3. Deploy Contracts

```bash
# Compile contracts
pnpm -C contracts build

# Deploy on Polygon Amoy
pnpm -C contracts deploy:amoy
```

Copy the **Experience address** from the deploy output.

### 4. Configure Token Prices

```bash
EXPERIENCE=0xYourExperienceAddress \
USDC_AMOY=0x... \
WETH_AMOY=0x... \
pnpm -C contracts cfg:set-prices:amoy
```

### 5. Run Applications

```bash
# Web app (port 3000)
pnpm dev:web

# Relayer (port 4000, optional)
pnpm dev:relayer
```

## Usage

### Buy Access
Visit: `/experience/[EXPERIENCE_ADDRESS]/buy`
- Select token (USDC, DAI, WETH)
- Choose quantity
- Approve → Buy

### Manage Settings (Owner Only)
Visit: `/experience/[EXPERIENCE_ADDRESS]/settings`
- Toggle token allowlist
- Set prices in raw token units
- Must be connected as contract owner

## Payment Splitting

- **5%** to platform wallet
- **10%** to current proposer (if set)
- **85%** to creator

## Token Requirements

Get test tokens on Polygon Amoy:
- USDC: Use Polygon faucets
- WETH: Wrap ETH using Amoy WETH contract
- DAI: Use Polygon faucets

## Development

The project uses:
- **Hardhat** for smart contracts
- **Next.js** with **viem** for frontend
- **Fastify** for relayer server
- **pnpm** workspaces for monorepo structure

## File Structure

```
experience-protocol/
├── contracts/           # Smart contracts & deployment
├── apps/web/           # Next.js frontend
├── apps/relayer/       # Fastify API server
└── packages/sdk/       # Shared SDK utilities
```
