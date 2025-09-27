import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("🚀 Deploying ExperienceRegistry to Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy ExperienceRegistry
  console.log("\n📋 Deploying ExperienceRegistry...");
  const ExperienceRegistry = await ethers.getContractFactory("ExperienceRegistry");
  const registry = await ExperienceRegistry.deploy();
  await registry.waitForDeployment();
  
  const registryAddress = await registry.getAddress();
  console.log("✅ ExperienceRegistry deployed to:", registryAddress);

  // Get existing factory address
  const factoryAddress = process.env.FACTORY_ADDRESS || process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  
  if (factoryAddress) {
    console.log("\n🔗 Connecting Factory to Registry...");
    
    // Authorize factory in registry
    console.log("Authorizing factory in registry...");
    const authTx = await registry.authorizeFactory(factoryAddress);
    await authTx.wait();
    console.log("✅ Factory authorized in registry");
    
    // Set registry in factory
    console.log("Setting registry in factory...");
    const ExperienceFactory = await ethers.getContractFactory("ExperienceFactory");
    const factory = ExperienceFactory.attach(factoryAddress);
    const setRegTx = await factory.setRegistry(registryAddress);
    await setRegTx.wait();
    console.log("✅ Registry set in factory");
    
    console.log("\n🎯 Integration complete!");
  } else {
    console.log("\n⚠️  No factory address provided. You'll need to manually:");
    console.log("1. Call registry.authorizeFactory(factoryAddress)");
    console.log("2. Call factory.setRegistry(registryAddress)");
  }

  console.log("\n📊 Deployment Summary:");
  console.log("Registry:", registryAddress);
  console.log("Factory:", factoryAddress || "Not provided");
  
  console.log("\n🔧 Environment Variables:");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`);
  
  console.log("\n🌐 Etherscan URLs:");
  console.log(`Registry: https://sepolia.etherscan.io/address/${registryAddress}`);
  if (factoryAddress) {
    console.log(`Factory: https://sepolia.etherscan.io/address/${factoryAddress}`);
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
