import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const EXPERIENCE = process.env.EXPERIENCE;
  const PRICE_ETH_WEI = process.env.PRICE_ETH_WEI;
  
  if (!EXPERIENCE) {
    throw new Error("EXPERIENCE environment variable not set");
  }
  if (!PRICE_ETH_WEI) {
    throw new Error("PRICE_ETH_WEI environment variable not set");
  }

  console.log("🔧 Setting price for Experience:", EXPERIENCE);
  console.log("New price (wei):", PRICE_ETH_WEI);
  console.log("New price (ETH):", ethers.formatEther(PRICE_ETH_WEI));

  const [deployer] = await ethers.getSigners();
  console.log("Setting price with account:", deployer.address);

  const experience = await ethers.getContractAt("Experience", EXPERIENCE);
  
  // Check current price
  const currentPrice = await experience.priceEthWei();
  console.log("Current price (ETH):", ethers.formatEther(currentPrice));
  
  // Set new price
  const tx = await experience.setPriceEthWei(PRICE_ETH_WEI);
  await tx.wait();
  
  console.log("✅ Price updated successfully!");
  console.log("Transaction:", tx.hash);
  
  // Verify
  const newPrice = await experience.priceEthWei();
  console.log("Verified new price (ETH):", ethers.formatEther(newPrice));
}

main().catch((error) => {
  console.error("❌ Price update failed:", error);
  process.exit(1);
});
