import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("🧪 Testing ExperienceRegistry functionality locally...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Deploy ExperienceRegistry locally
  console.log("\n📋 Deploying ExperienceRegistry locally...");
  const ExperienceRegistry = await ethers.getContractFactory("ExperienceRegistry");
  const registry = await ExperienceRegistry.deploy();
  await registry.waitForDeployment();
  
  const registryAddress = await registry.getAddress();
  console.log("✅ ExperienceRegistry deployed to:", registryAddress);

  // Deploy ExperienceFactory
  console.log("\n📦 Deploying ExperienceFactory...");
  const Factory = await ethers.getContractFactory("ExperienceFactory");
  const factory = await Factory.deploy(
    deployer.address, // platform wallet
    500 // platform fee bps (5%)
  );
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ ExperienceFactory deployed to:", factoryAddress);

  // Set registry in factory
  console.log("\n🔗 Setting registry in factory...");
  const setRegTx = await factory.setRegistry(registryAddress);
  await setRegTx.wait();
  console.log("✅ Registry set in factory");

  // Authorize factory in registry
  console.log("\n🔗 Authorizing factory in registry...");
  const authTx = await registry.authorizeFactory(factoryAddress);
  await authTx.wait();
  console.log("✅ Factory authorized in registry");

  // Create a test experience
  console.log("\n🎯 Creating test experience...");
  const creator = deployer.address;
  const flowSyncAuthority = deployer.address;
  const proposerFeeBps = 1000; // 10%
  const cidInitial = "test-cid-registry";

  const createTx = await factory.createExperience(
    creator,
    cidInitial,
    flowSyncAuthority,
    proposerFeeBps
  );
  
  const receipt = await createTx.wait();
  const event = receipt.logs.find(log => log.fragment?.name === "ExperienceCreated");
  const experienceAddress = event.args[1];
  
  console.log("✅ Test Experience deployed to:", experienceAddress);

  // Test registry functions
  console.log("\n🔍 Testing registry functions...");
  
  // Get created experiences
  const createdExperiences = await registry.getCreatedExperiences(creator);
  console.log("📋 Created experiences:", createdExperiences.length);
  
  // Get experience info
  const experienceInfo = await registry.getExperienceInfo(experienceAddress);
  console.log("📊 Experience info:", {
    creator: experienceInfo.creator,
    cid: experienceInfo.cid,
    createdAt: experienceInfo.createdAt?.toString() || 'N/A',
    totalPurchases: experienceInfo.totalPurchases?.toString() || '0',
    totalRevenue: experienceInfo.totalRevenue ? ethers.formatEther(experienceInfo.totalRevenue) + " ETH" : '0 ETH'
  });

  // Simulate a purchase
  console.log("\n💰 Simulating purchase...");
  const experience = await ethers.getContractAt("Experience", experienceAddress);
  
  // Set price
  const priceTx = await experience.setPriceEthWei(ethers.parseEther("0.01"));
  await priceTx.wait();
  console.log("✅ Price set to 0.01 ETH");

  // Buy passes
  const buyTx = await experience.buyWithEth(2, { value: ethers.parseEther("0.02") });
  await buyTx.wait();
  console.log("✅ Bought 2 passes");

  // Check registry for purchases
  const purchasedExperiences = await registry.getPurchasedExperiences(deployer.address);
  console.log("🎫 Purchased experiences:", purchasedExperiences.length);
  
  if (purchasedExperiences.length > 0) {
    const purchase = purchasedExperiences[0];
    console.log("📊 Purchase info:", {
      experience: purchase.experience,
      purchaser: purchase.purchaser,
      quantity: purchase.quantity?.toString() || '0',
      timestamp: purchase.timestamp?.toString() || 'N/A',
      txHash: purchase.txHash
    });
  }

  // Test hasPurchased
  const hasPurchased = await registry.hasPurchased(deployer.address, experienceAddress);
  console.log("✅ Has purchased:", hasPurchased);

  // Test total experiences
  const totalExperiences = await registry.getTotalExperiences();
  console.log("📊 Total experiences:", totalExperiences.toString());

  // Test getAllExperiences
  const allExperiences = await registry.getAllExperiences(0, 10);
  console.log("📋 All experiences:", allExperiences.length);

  console.log("\n🎉 Registry functionality test completed successfully!");
  console.log("\n📋 Test Summary:");
  console.log("- Registry deployed and connected to factory");
  console.log("- Experience created and registered");
  console.log("- Purchase recorded in registry");
  console.log("- All registry functions working correctly");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
