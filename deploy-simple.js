import { createWalletClient, http, createPublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

// Contract artifacts
import ExperienceFactoryAbi from './contracts/artifacts/contracts/ExperienceFactory.sol/ExperienceFactory.json' assert { type: 'json' };
import ExperienceAbi from './contracts/artifacts/contracts/Experience.sol/Experience.json' assert { type: 'json' };

const PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOYER;
const PLATFORM_WALLET = "0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6";
const PLATFORM_FEE_BPS = 500; // 5%

async function deploy() {
  console.log("🚀 Deploying Experience Protocol to Sepolia...");
  
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log("Deploying with account:", account.address);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://rpc.ankr.com/eth_sepolia'),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http('https://rpc.ankr.com/eth_sepolia'),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Account balance:", (Number(balance) / 1e18).toFixed(4), "ETH");

  if (balance === 0n) {
    console.error("❌ No ETH balance. Please fund the wallet first.");
    return;
  }

  try {
    // Deploy Factory
    console.log("📦 Deploying ExperienceFactory...");
    const factoryHash = await walletClient.deployContract({
      abi: ExperienceFactoryAbi.abi,
      bytecode: ExperienceFactoryAbi.bytecode,
      args: [PLATFORM_WALLET, PLATFORM_FEE_BPS],
    });

    console.log("⏳ Waiting for factory deployment...");
    const factoryReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: factoryHash 
    });
    const factoryAddress = factoryReceipt.contractAddress;
    console.log("✅ ExperienceFactory deployed to:", factoryAddress);

    // Create demo experience
    console.log("🎯 Creating demo Experience...");
    const createTx = await walletClient.writeContract({
      address: factoryAddress,
      abi: ExperienceFactoryAbi.abi,
      functionName: 'createExperience',
      args: [
        PLATFORM_WALLET, // creator
        'ipfs://placeholder', // cidInitial
        PLATFORM_WALLET, // flowSyncAuthority
        1000 // proposerFeeBps (10%)
      ],
    });

    console.log("⏳ Waiting for experience creation...");
    const createReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: createTx 
    });
    
    // Find the ExperienceCreated event
    const createEvent = createReceipt.logs.find(log => 
      log.topics[0] === '0x9848cc71077a41948e33eefbe6b2ea321b0e62b56320f077eb694a03c3352d9d'
    );
    
    if (!createEvent) {
      console.error("❌ Could not find ExperienceCreated event");
      return;
    }

    const experienceAddress = `0x${createEvent.topics[2].slice(26)}`;
    console.log("✅ Demo Experience deployed to:", experienceAddress);

    // Set initial price
    console.log("💰 Setting initial price...");
    const priceWei = BigInt(0.01 * 1e18); // 0.01 ETH
    
    const priceTx = await walletClient.writeContract({
      address: experienceAddress,
      abi: ExperienceAbi.abi,
      functionName: 'setPriceEthWei',
      args: [priceWei],
    });

    await publicClient.waitForTransactionReceipt({ hash: priceTx });
    console.log("✅ Price set to: 0.01 ETH");

    // Output results
    console.log("\n📋 Deployment Summary:");
    console.log("========================");
    console.log("Factory:", factoryAddress);
    console.log("Experience:", experienceAddress);
    console.log("Platform Wallet:", PLATFORM_WALLET);
    console.log("Platform Fee: 5%");
    console.log("Price per Pass: 0.01 ETH");
    
    console.log("\n🔗 Etherscan URLs:");
    console.log("Factory:", `https://sepolia.etherscan.io/address/${factoryAddress}`);
    console.log("Experience:", `https://sepolia.etherscan.io/address/${experienceAddress}`);

    console.log("\n📝 Environment Variables for Vercel:");
    console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
    console.log(`NEXT_PUBLIC_EXPERIENCE_ADDRESS=${experienceAddress}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

deploy().catch(console.error);
