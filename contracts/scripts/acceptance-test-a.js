import pkg from "hardhat";
const { ethers } = pkg;

const EXPERIENCE = "0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A";
const EXPECTED_PLATFORM_WALLET = "0x74439074A096c8C9519C499c47484347FA6857aA";
const EXPECTED_PLATFORM_FEE_BPS = 500;

async function main() {
  console.log("A) ABI & Role Integrity");
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const exp = await ethers.getContractAt("Experience", EXPERIENCE, provider);
  
  // Check required functions exist
  const requiredFunctions = [
    'setTokenPrice', 'setTokenAllowed', 'buyWithToken', 
    'setCurrentProposer', 'setCid', 'cid', 'owner',
    'PLATFORM_WALLET', 'PLATFORM_FEE_BPS', 'proposerFeeBps',
    'currentProposer', 'allowedToken', 'priceByToken'
  ];
  
  for (const func of requiredFunctions) {
    if (!exp.interface.getFunction(func)) {
      throw new Error(`Missing function: ${func}`);
    }
  }
  
  // Check platform wallet and fee
  const platformWallet = await exp.PLATFORM_WALLET();
  const platformFeeBps = await exp.PLATFORM_FEE_BPS();
  
  if (platformWallet.toLowerCase() !== EXPECTED_PLATFORM_WALLET.toLowerCase()) {
    throw new Error(`Platform wallet mismatch: expected ${EXPECTED_PLATFORM_WALLET}, got ${platformWallet}`);
  }
  
  if (Number(platformFeeBps) !== EXPECTED_PLATFORM_FEE_BPS) {
    throw new Error(`Platform fee mismatch: expected ${EXPECTED_PLATFORM_FEE_BPS}, got ${Number(platformFeeBps)}`);
  }
  
  console.log("✅ PASS - All functions present, platform settings correct");
}

main().catch(e => {
  console.log("❌ FAIL:", e.message);
  process.exit(1);
});
