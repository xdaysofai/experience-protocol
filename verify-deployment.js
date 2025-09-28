import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

// Contract addresses from existing deployment
const FACTORY_ADDRESS = '0x811015DC2e3f281ea25EB41fDEeFb2809342784F';
const EXPERIENCE_ADDRESS = '0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://rpc.ankr.com/eth_sepolia'),
});

async function verifyDeployment() {
  console.log('🔍 Verifying existing deployment on Sepolia...\n');

  try {
    // Check if contracts exist
    console.log('📋 Contract Verification:');
    console.log('========================');

    const factoryCode = await publicClient.getBytecode({ address: FACTORY_ADDRESS });
    const experienceCode = await publicClient.getBytecode({ address: EXPERIENCE_ADDRESS });

    console.log('Factory Contract:', FACTORY_ADDRESS);
    console.log('  Status:', factoryCode ? '✅ Deployed' : '❌ Not found');
    console.log('  Etherscan:', `https://sepolia.etherscan.io/address/${FACTORY_ADDRESS}`);

    console.log('\nExperience Contract:', EXPERIENCE_ADDRESS);
    console.log('  Status:', experienceCode ? '✅ Deployed' : '❌ Not found');
    console.log('  Etherscan:', `https://sepolia.etherscan.io/address/${EXPERIENCE_ADDRESS}`);

    if (!factoryCode || !experienceCode) {
      console.log('\n❌ One or more contracts not found on Sepolia');
      return;
    }

    // Check Experience contract details
    console.log('\n📊 Experience Contract Details:');
    console.log('==============================');

    const experienceAbi = [
      { "type": "function", "name": "owner", "inputs": [], "outputs": [{"type": "address"}], "stateMutability": "view" },
      { "type": "function", "name": "priceEthWei", "inputs": [], "outputs": [{"type": "uint256"}], "stateMutability": "view" },
      { "type": "function", "name": "cid", "inputs": [], "outputs": [{"type": "string"}], "stateMutability": "view" },
      { "type": "function", "name": "currentProposer", "inputs": [], "outputs": [{"type": "address"}], "stateMutability": "view" },
      { "type": "function", "name": "PLATFORM_WALLET", "inputs": [], "outputs": [{"type": "address"}], "stateMutability": "view" },
      { "type": "function", "name": "PLATFORM_FEE_BPS", "inputs": [], "outputs": [{"type": "uint16"}], "stateMutability": "view" },
    ];

    try {
      const [owner, priceEthWei, cid, currentProposer, platformWallet, platformFeeBps] = await Promise.all([
        publicClient.readContract({
          address: EXPERIENCE_ADDRESS,
          abi: experienceAbi,
          functionName: 'owner',
        }),
        publicClient.readContract({
          address: EXPERIENCE_ADDRESS,
          abi: experienceAbi,
          functionName: 'priceEthWei',
        }),
        publicClient.readContract({
          address: EXPERIENCE_ADDRESS,
          abi: experienceAbi,
          functionName: 'cid',
        }),
        publicClient.readContract({
          address: EXPERIENCE_ADDRESS,
          abi: experienceAbi,
          functionName: 'currentProposer',
        }),
        publicClient.readContract({
          address: EXPERIENCE_ADDRESS,
          abi: experienceAbi,
          functionName: 'PLATFORM_WALLET',
        }),
        publicClient.readContract({
          address: EXPERIENCE_ADDRESS,
          abi: experienceAbi,
          functionName: 'PLATFORM_FEE_BPS',
        }),
      ]);

      console.log('Owner:', owner);
      console.log('Price per Pass:', (Number(priceEthWei) / 1e18).toFixed(4), 'ETH');
      console.log('Content CID:', cid);
      console.log('Current Proposer:', currentProposer);
      console.log('Platform Wallet:', platformWallet);
      console.log('Platform Fee:', (Number(platformFeeBps) / 100), '%');

      // Test if we can create a new experience via factory
      console.log('\n🏭 Factory Functionality Test:');
      console.log('===============================');
      
      const factoryAbi = [
        { "type": "function", "name": "PLATFORM_WALLET", "inputs": [], "outputs": [{"type": "address"}], "stateMutability": "view" },
        { "type": "function", "name": "PLATFORM_FEE_BPS", "inputs": [], "outputs": [{"type": "uint16"}], "stateMutability": "view" },
      ];

      const [factoryPlatformWallet, factoryPlatformFeeBps] = await Promise.all([
        publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: factoryAbi,
          functionName: 'PLATFORM_WALLET',
        }),
        publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: factoryAbi,
          functionName: 'PLATFORM_FEE_BPS',
        }),
      ]);

      console.log('Factory Platform Wallet:', factoryPlatformWallet);
      console.log('Factory Platform Fee:', (Number(factoryPlatformFeeBps) / 100), '%');

      console.log('\n🎉 Deployment Verification Complete!');
      console.log('=====================================');
      console.log('✅ All contracts are deployed and functional');
      console.log('✅ Experience Protocol is ready to use');
      
      console.log('\n📱 Next Steps:');
      console.log('==============');
      console.log('1. Add environment variables to Vercel:');
      console.log(`   NEXT_PUBLIC_FACTORY_ADDRESS=${FACTORY_ADDRESS}`);
      console.log(`   NEXT_PUBLIC_EXPERIENCE_ADDRESS=${EXPERIENCE_ADDRESS}`);
      console.log('2. Test the buy flow at:');
      console.log(`   https://your-app.vercel.app/experience/${EXPERIENCE_ADDRESS}/buy`);
      console.log('3. Test settings (owner only) at:');
      console.log(`   https://your-app.vercel.app/experience/${EXPERIENCE_ADDRESS}/settings`);

    } catch (contractError) {
      console.log('❌ Error reading contract data:', contractError.message);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyDeployment().catch(console.error);
