import pkg from "hardhat";
const { ethers } = pkg;

const EXPERIENCE = "0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A";

async function main() {
  console.log("B) SBT Non-Transferability");
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const exp = await ethers.getContractAt("Experience", EXPERIENCE, provider);
  
  // Test safeTransferFrom reverts
  const dummyAddress = "0x1234567890123456789012345678901234567890";
  
  try {
    await exp.safeTransferFrom.staticCall(dummyAddress, dummyAddress, 1, 1, "0x");
    console.log("❌ FAIL: safeTransferFrom should revert but didn't");
    process.exit(1);
  } catch (error) {
    if (error.message.includes("TransfersDisabled")) {
      console.log("✅ PASS - safeTransferFrom reverts with TransfersDisabled");
    } else {
      console.log("❌ FAIL: Wrong revert reason:", error.message);
      process.exit(1);
    }
  }
}

main().catch(e => {
  console.log("❌ FAIL:", e.message);
  process.exit(1);
});
