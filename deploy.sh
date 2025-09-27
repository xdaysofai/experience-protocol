#!/bin/bash

# Experience Protocol Deployment Script
# For MetaMask address: 0x74439074A096c8C9519C499c47484347FA6857aA

echo "🚀 Experience Protocol Deployment"
echo "================================="
echo ""
echo "Your wallet address: 0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6"
echo "✅ Confirmed Sepolia ETH balance: 0.282 ETH"
echo ""

# Check if private key is set
if grep -q "PRIVATE_KEY_DEPLOYER=0x496825bc820fbb96ffe0dbc6c4caf6b20f513a30975e3973900d9e811e99c93f" .env; then
    echo "⚠️  You need to update the private key in .env file"
    echo ""
    echo "Steps:"
    echo "1. Open MetaMask → Account Details → Export Private Key"
    echo "2. Copy the private key (starts with 0x...)"
    echo "3. Run this command:"
    echo "   sed -i '' 's/PRIVATE_KEY_DEPLOYER=.*/PRIVATE_KEY_DEPLOYER=0xYOUR_PRIVATE_KEY/' .env"
    echo ""
    echo "Then run this script again: ./deploy.sh"
    exit 1
fi

echo "🔑 Private key detected in .env"
echo "📡 Deploying to Ethereum Sepolia..."
echo ""

# Deploy contracts
echo "⏳ Deploying contracts..."
pnpm -C contracts deploy:sepolia

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "Next steps:"
    echo "1. Copy the contract addresses from above"
    echo "2. Update apps/web/.env.local with the new addresses"
    echo "3. Configure token prices:"
    echo "   EXPERIENCE=0xYourExperienceAddress pnpm -C contracts cfg:set-prices:sepolia"
    echo "4. Test the web app: pnpm dev:web"
    echo ""
    echo "💰 You will receive 5% platform fees at: 0x74439074A096c8C9519C499c47484347FA6857aA"
else
    echo "❌ Deployment failed. Check the error above."
fi
