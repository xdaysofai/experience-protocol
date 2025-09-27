import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const address = process.env.CHECK_ADDRESS || "0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F";
  console.log("Checking Experience contract at:", address);
  
  try {
    const exp = await ethers.getContractAt("Experience", address);
    
    console.log("✅ Contract found!");
    
    // Check basic details
    const owner = await exp.owner();
    const price = await exp.priceEthWei();
    const cid = await exp.cid();
    
    console.log("\nContract Details:");
    console.log("- Owner:", owner);
    console.log("- Price (wei):", price.toString());
    console.log("- Price (ETH):", ethers.formatEther(price));
    console.log("- CID:", cid);
    
    // Check if price is set
    if (price === 0n) {
      console.log("\n❌ ISSUE: Price is 0 - contract needs price configuration!");
      console.log("Run: EXPERIENCE=" + address + " PRICE_ETH_WEI=10000000000000000 pnpm -C contracts run cfg:set-price:sepolia");
    } else {
      console.log("\n✅ Price is configured");
    }
    
    // Check if CID is set
    if (!cid || cid === "") {
      console.log("❌ ISSUE: CID is empty - content not set");
    } else {
      console.log("✅ CID is set");
    }
    
  } catch (err) {
    console.log("❌ Error:", err.message);
    
    // Check if contract exists at all
    const provider = ethers.provider;
    const code = await provider.getCode(address);
    if (code === "0x") {
      console.log("❌ No contract deployed at this address");
    } else {
      console.log("Contract exists but ABI mismatch or other error");
    }
  }
}

main().catch(console.error);
