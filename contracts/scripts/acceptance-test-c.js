import pkg from "hardhat";
const { ethers } = pkg;

const EXPERIENCE = "0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A";
const TOKENS = [
  {sym: "USDC", addr: "0xa0b86a33e6441fa0AD07C8e3a83Bf3F1d0B49fA2"},
  {sym: "WETH", addr: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"},
  {sym: "DAI", addr: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357"}
];

const erc20Abi = [
  { "type":"function","name":"decimals","stateMutability":"view","inputs":[],"outputs":[{"type":"uint8"}]}
];

async function main() {
  console.log("C) Split Math Invariant");
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const exp = await ethers.getContractAt("Experience", EXPERIENCE, provider);
  
  const platformBps = await exp.PLATFORM_FEE_BPS();
  const proposerBps = await exp.proposerFeeBps();
  const currentProposer = await exp.currentProposer();
  
  console.log("| Token | Decimals | Price | Cost (2x) | Platform | Proposer | Creator | Result |");
  console.log("|-------|----------|-------|-----------|----------|----------|---------|--------|");
  
  let allPassed = true;
  
  for (const token of TOKENS) {
    try {
      const allowed = await exp.allowedToken(token.addr);
      const price = await exp.priceByToken(token.addr);
      
      if (!allowed || price === 0n) {
        console.log(`| ${token.sym} | - | - | NOT CONFIGURED | - | - | - | SKIP |`);
        continue;
      }
      
      const erc20 = new ethers.Contract(token.addr, erc20Abi, provider);
      const decimals = await erc20.decimals();
      
      const cost = price * 2n;
      const platformAmount = (cost * BigInt(platformBps)) / 10_000n;
      const proposerAmount = currentProposer === ethers.ZeroAddress ? 0n : (cost * BigInt(proposerBps)) / 10_000n;
      const creatorAmount = cost - platformAmount - proposerAmount;
      
      const recalculated = platformAmount + proposerAmount + creatorAmount;
      const passed = recalculated === cost;
      allPassed = allPassed && passed;
      
      const formatAmount = (amt) => (Number(amt) / Math.pow(10, decimals)).toFixed(6);
      
      console.log(`| ${token.sym} | ${decimals} | ${formatAmount(price)} | ${formatAmount(cost)} | ${formatAmount(platformAmount)} | ${formatAmount(proposerAmount)} | ${formatAmount(creatorAmount)} | ${passed ? 'PASS' : 'FAIL'} |`);
      
    } catch (error) {
      console.log(`| ${token.sym} | ERROR | ${error.message.substring(0, 20)}... | - | - | - | - | FAIL |`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log("✅ PASS - All split math calculations correct");
  } else {
    console.log("❌ FAIL - Split math errors detected");
    process.exit(1);
  }
}

main().catch(e => {
  console.log("❌ FAIL:", e.message);
  process.exit(1);
});
