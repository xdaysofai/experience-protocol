import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const address = "0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F";
  const newPrice = "10000000000000000"; // 0.01 ETH
  
  console.log("🔧 Fixing price for Experience:", address);
  console.log("Setting price to:", ethers.formatEther(newPrice), "ETH");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Try different ABIs
  const possibleABIs = [
    // Current ETH-only ABI
    [
      "function setPriceEthWei(uint256 _priceEthWei) public",
      "function priceEthWei() public view returns (uint256)",
      "function owner() public view returns (address)"
    ],
    // Legacy token-based ABI
    [
      "function setTokenPrice(address token, uint256 price) public", 
      "function priceByToken(address token) public view returns (uint256)",
      "function owner() public view returns (address)"
    ]
  ];
  
  for (let i = 0; i < possibleABIs.length; i++) {
    try {
      console.log(`\nTrying ABI variant ${i + 1}...`);
      const contract = new ethers.Contract(address, possibleABIs[i], deployer);
      
      if (i === 0) {
        // ETH-only contract
        console.log("Attempting ETH-only setPriceEthWei...");
        const tx = await contract.setPriceEthWei(newPrice);
        await tx.wait();
        console.log("✅ Price set successfully!");
        console.log("Transaction:", tx.hash);
        return;
      } else {
        // Token-based contract - set price for ETH (zero address)
        console.log("Attempting token-based setTokenPrice...");
        const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
        const tx = await contract.setTokenPrice(ETH_ADDRESS, newPrice);
        await tx.wait();
        console.log("✅ Price set successfully!");
        console.log("Transaction:", tx.hash);
        return;
      }
    } catch (err) {
      console.log(`❌ ABI variant ${i + 1} failed:`, err.message);
    }
  }
  
  console.log("❌ All ABI variants failed. Contract might have different interface.");
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
