import { readFileSync } from 'fs';
import { ethers } from 'ethers';

// Load environment variables from parent directory
const envContent = readFileSync('../.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value;
  }
});

const PRIVATE_KEY = envVars.PRIVATE_KEY_DEPLOYER;
const RPC_URL = envVars.RPC_ETHEREUM_SEPOLIA || 'https://ethereum-sepolia-rpc.publicnode.com';
const PLATFORM_WALLET = envVars.PLATFORM_WALLET;
const PLATFORM_FEE_BPS = parseInt(envVars.PLATFORM_FEE_BPS || '500', 10);

console.log('🚀 Deploying Experience Protocol to Sepolia');
console.log('============================================');
console.log('Private key loaded:', PRIVATE_KEY ? '✅ Yes' : '❌ No');
console.log('Platform wallet:', PLATFORM_WALLET);
console.log('Platform fee:', PLATFORM_FEE_BPS, 'bps');
console.log('');

async function main() {
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Deployer address:', wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  
  if (balance === 0n) {
    throw new Error('Insufficient balance for deployment');
  }
  
  // Load contract artifacts
  const factoryArtifact = JSON.parse(readFileSync('./artifacts/contracts/ExperienceFactory.sol/ExperienceFactory.json', 'utf8'));
  
  // Deploy ExperienceFactory
  console.log('\\n📦 Deploying ExperienceFactory...');
  const FactoryContract = new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, wallet);
  const factory = await FactoryContract.deploy(PLATFORM_WALLET, PLATFORM_FEE_BPS);
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log('✅ ExperienceFactory deployed:', factoryAddress);
  
  // Deploy demo Experience
  console.log('\\n📦 Creating demo Experience...');
  const creator = wallet.address;
  const cidInitial = "demo-cid";
  const flowSyncAuthority = wallet.address;
  
  const tx = await factory.createExperience(creator, cidInitial, flowSyncAuthority, 1000);
  const receipt = await tx.wait();
  
  // Find the ExperienceCreated event
  const iface = new ethers.Interface(factoryArtifact.abi);
  const event = receipt.logs.find(log => {
    try {
      const parsed = iface.parseLog(log);
      return parsed && parsed.name === 'ExperienceCreated';
    } catch {
      return false;
    }
  });
  
  const experienceAddress = event ? iface.parseLog(event).args.experience : null;
  
  console.log('✅ Experience deployed:', experienceAddress);
  console.log('');
  console.log('🎉 Deployment successful!');
  console.log('');
  console.log('📝 Update your .env.local with:');
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`NEXT_PUBLIC_EXPERIENCE_ADDRESS=${experienceAddress}`);
  console.log('');
  console.log('🔗 View on Etherscan:');
  console.log(`Factory: https://sepolia.etherscan.io/address/${factoryAddress}`);
  console.log(`Experience: https://sepolia.etherscan.io/address/${experienceAddress}`);
}

main().catch(console.error);
