import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("🚀 Deploying ETH-only Experience Protocol to Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Single wallet configuration
  const SINGLE_WALLET = "0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6";
  const PLATFORM_FEE_BPS = 500; // 5%

  // Deploy Factory
  console.log("\n📦 Deploying ExperienceFactoryETH...");
  const FactoryETH = await ethers.getContractFactory("ExperienceFactoryETH");
  const factory = await FactoryETH.deploy(SINGLE_WALLET, PLATFORM_FEE_BPS);
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ ExperienceFactoryETH deployed to:", factoryAddress);

  // Deploy a demo experience
  console.log("\n🎯 Creating demo Experience...");
  const CREATOR = SINGLE_WALLET;
  const FLOW_SYNC_AUTHORITY = SINGLE_WALLET;
  const PROPOSER_FEE_BPS = 1000; // 10%
  const PRICE_PER_PASS = ethers.parseEther("0.01"); // 0.01 ETH per pass

  const tx = await factory.createExperience(
    CREATOR,
    "cid-eth-demo",
    FLOW_SYNC_AUTHORITY,
    PROPOSER_FEE_BPS,
    PRICE_PER_PASS
  );
  
  const receipt = await tx.wait();
  const event = receipt.logs.find(log => log.fragment?.name === "ExperienceCreated");
  const experienceAddress = event.args[1];
  
  console.log("✅ Demo Experience deployed to:", experienceAddress);
  console.log("💰 Price per pass:", ethers.formatEther(PRICE_PER_PASS), "ETH");

  // Verification info
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("Network: Ethereum Sepolia");
  console.log("Factory:", factoryAddress);
  console.log("Experience:", experienceAddress);
  console.log("Single Wallet (Creator/Platform/FlowSync):", SINGLE_WALLET);
  console.log("Platform Fee:", PLATFORM_FEE_BPS / 100, "%");
  console.log("Price per Pass:", ethers.formatEther(PRICE_PER_PASS), "ETH");

  console.log("\n🌐 Frontend Configuration:");
  console.log("NEXT_PUBLIC_FACTORY_ADDRESS_ETH=" + factoryAddress);
  console.log("NEXT_PUBLIC_EXPERIENCE_ADDRESS_ETH=" + experienceAddress);
  console.log("NEXT_PUBLIC_PRICE_PER_PASS_ETH=" + PRICE_PER_PASS.toString());

  console.log("\n🔗 Etherscan URLs:");
  console.log("Factory:", `https://sepolia.etherscan.io/address/${factoryAddress}`);
  console.log("Experience:", `https://sepolia.etherscan.io/address/${experienceAddress}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
