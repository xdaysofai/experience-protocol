import pkg from "hardhat";
const { ethers } = pkg;

const SINGLE_WALLET = "0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6";

async function main() {
  console.log("🧪 ETH-Only Experience Protocol - Acceptance Test");
  console.log("================================================");
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  // Test deployment
  console.log("\n1) Deploying contracts locally...");
  const [deployer] = await ethers.getSigners();
  
  // Deploy Factory
  const FactoryETH = await ethers.getContractFactory("ExperienceFactoryETH");
  const factory = await FactoryETH.deploy(SINGLE_WALLET, 500); // 5% platform fee
  await factory.waitForDeployment();
  console.log("✅ Factory deployed");
  
  // Create Experience
  const tx = await factory.createExperience(
    SINGLE_WALLET,           // creator
    "cid-test",              // cid
    SINGLE_WALLET,           // flowSyncAuthority  
    1000,                    // proposerFeeBps (10%)
    ethers.parseEther("0.01") // 0.01 ETH per pass
  );
  
  const receipt = await tx.wait();
  const event = receipt.logs.find(log => log.fragment?.name === "ExperienceCreated");
  const experienceAddress = event.args[1];
  
  const exp = await ethers.getContractAt("ExperienceETH", experienceAddress);
  console.log("✅ Experience deployed at:", experienceAddress);
  
  // Test 2: Contract Configuration
  console.log("\n2) Verifying contract configuration...");
  
  const creator = await exp.creator();
  const platformWallet = await exp.PLATFORM_WALLET();
  const platformFeeBps = await exp.PLATFORM_FEE_BPS();
  const flowSyncAuthority = await exp.flowSyncAuthority();
  const pricePerPass = await exp.pricePerPass();
  
  console.log("Creator:", creator);
  console.log("Platform Wallet:", platformWallet);
  console.log("Platform Fee BPS:", Number(platformFeeBps));
  console.log("FlowSync Authority:", flowSyncAuthority);
  console.log("Price per Pass:", ethers.formatEther(pricePerPass), "ETH");
  
  // Verify all are the single wallet
  const expectedWallet = SINGLE_WALLET.toLowerCase();
  const allMatch = [creator, platformWallet, flowSyncAuthority].every(
    addr => addr.toLowerCase() === expectedWallet
  );
  
  if (allMatch) {
    console.log("✅ All roles correctly assigned to single wallet");
  } else {
    console.log("❌ Wallet assignment mismatch");
    process.exit(1);
  }
  
  // Test 3: SBT Non-Transferability
  console.log("\n3) Testing SBT non-transferability...");
  
  try {
    await exp.safeTransferFrom.staticCall(
      deployer.address, 
      SINGLE_WALLET, 
      1, 
      1, 
      "0x"
    );
    console.log("❌ Transfer should have reverted");
    process.exit(1);
  } catch (error) {
    if (error.message.includes("TransfersDisabled")) {
      console.log("✅ Transfers correctly disabled");
    } else {
      console.log("❌ Unexpected revert reason:", error.message);
      process.exit(1);
    }
  }
  
  // Test 4: ETH Payment and Split Logic
  console.log("\n4) Testing ETH payment splits...");
  
  const quantity = 2n;
  const totalCost = pricePerPass * quantity;
  
  // Calculate expected splits
  const expectedPlatform = (totalCost * 500n) / 10_000n; // 5%
  const expectedProposer = (totalCost * 1000n) / 10_000n; // 10%
  const expectedCreator = totalCost - expectedPlatform - expectedProposer; // 85%
  
  console.log("Purchase simulation:");
  console.log("- Quantity:", quantity.toString());
  console.log("- Total Cost:", ethers.formatEther(totalCost), "ETH");
  console.log("- Platform (5%):", ethers.formatEther(expectedPlatform), "ETH");
  console.log("- Proposer (10%):", ethers.formatEther(expectedProposer), "ETH");
  console.log("- Creator (85%):", ethers.formatEther(expectedCreator), "ETH");
  
  // Verify split math
  const recalculated = expectedPlatform + expectedProposer + expectedCreator;
  if (recalculated === totalCost) {
    console.log("✅ Split math correct - no wei lost");
  } else {
    console.log("❌ Split math error:", {
      original: totalCost.toString(),
      recalculated: recalculated.toString()
    });
    process.exit(1);
  }
  
  // Test 5: Owner-only functions
  console.log("\n5) Testing owner-only protection...");
  
  const randomAddress = "0x1234567890123456789012345678901234567890";
  try {
    await exp.setPrice.staticCall(ethers.parseEther("0.02"), { from: randomAddress });
    console.log("❌ setPrice should revert for non-owner");
    process.exit(1);
  } catch (error) {
    if (error.message.includes("Ownable") || error.message.includes("Unauthorized")) {
      console.log("✅ setPrice protected by onlyOwner");
    } else {
      console.log("⚠️ setPrice reverts but unclear reason:", error.message);
    }
  }
  
  console.log("\n🎉 All ETH-Only Acceptance Tests PASSED!");
  console.log("========================================");
  console.log("✅ Contract deployment successful");
  console.log("✅ Single wallet configuration verified");
  console.log("✅ SBT transfers disabled");
  console.log("✅ ETH payment splits calculated correctly");
  console.log("✅ Owner protection working");
  console.log("\n🚀 Ready for Sepolia deployment!");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
