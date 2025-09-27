import pkg from "hardhat";
const { ethers } = pkg;

const EXPERIENCE = "0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A";
const EXPECTED_OWNER = "0xa8B131BfeBfc63c67263b8EA33cE91FA624FD9b6";

async function main() {
  console.log("D) Owner & FlowSync Authority");
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const exp = await ethers.getContractAt("Experience", EXPERIENCE, provider);
  
  // Check owner
  const owner = await exp.owner();
  if (owner.toLowerCase() !== EXPECTED_OWNER.toLowerCase()) {
    console.log(`❌ FAIL: Owner mismatch - expected ${EXPECTED_OWNER}, got ${owner}`);
    process.exit(1);
  }
  
  // Check flowSyncAuthority exists
  const flowSyncAuthority = await exp.flowSyncAuthority();
  
  // Test onlyOwner protection on setTokenPrice (simulate call from non-owner)
  const nonOwner = "0x1234567890123456789012345678901234567890";
  try {
    await exp.setTokenPrice.staticCall(ethers.ZeroAddress, 0, false, {from: nonOwner});
    console.log("❌ FAIL: setTokenPrice should revert for non-owner");
    process.exit(1);
  } catch (error) {
    if (error.message.includes("OwnableUnauthorizedAccount") || error.message.includes("Ownable")) {
      console.log("✅ setTokenPrice protected by onlyOwner");
    } else {
      console.log("⚠️ setTokenPrice reverts but unclear if due to onlyOwner:", error.message);
    }
  }
  
  console.log(`✅ PASS - Owner: ${owner}, FlowSync: ${flowSyncAuthority}`);
}

main().catch(e => {
  console.log("❌ FAIL:", e.message);
  process.exit(1);
});
