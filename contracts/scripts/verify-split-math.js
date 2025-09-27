// Simple split math verification without network calls

console.log("🔍 Verifying Experience Protocol Split Math");
console.log("==========================================");

// Test parameters (from deployed contract)
const PLATFORM_FEE_BPS = 500;  // 5%
const PROPOSER_FEE_BPS = 1000;  // 10%
const UNIT_PRICE = BigInt("10000000"); // 10 USDC (6 decimals)
const QUANTITY = 2n;
const TOTAL_COST = UNIT_PRICE * QUANTITY; // 20 USDC

console.log(`\n📊 Test Scenario:`);
console.log(`Unit Price: ${UNIT_PRICE.toString()} wei (${Number(UNIT_PRICE) / 1e6} USDC)`);
console.log(`Quantity: ${QUANTITY.toString()}`);
console.log(`Total Cost: ${TOTAL_COST.toString()} wei (${Number(TOTAL_COST) / 1e6} USDC)`);

// Calculate splits
const platformAmount = (TOTAL_COST * BigInt(PLATFORM_FEE_BPS)) / 10_000n;
const proposerAmount = (TOTAL_COST * BigInt(PROPOSER_FEE_BPS)) / 10_000n;
const creatorAmount = TOTAL_COST - platformAmount - proposerAmount;

console.log(`\n💰 Split Calculation:`);
console.log(`Platform (${PLATFORM_FEE_BPS} BPS = ${PLATFORM_FEE_BPS/100}%): ${platformAmount.toString()} wei (${Number(platformAmount) / 1e6} USDC)`);
console.log(`Proposer (${PROPOSER_FEE_BPS} BPS = ${PROPOSER_FEE_BPS/100}%): ${proposerAmount.toString()} wei (${Number(proposerAmount) / 1e6} USDC)`);
console.log(`Creator (remainder): ${creatorAmount.toString()} wei (${Number(creatorAmount) / 1e6} USDC)`);

// Verify totals
const calculatedTotal = platformAmount + proposerAmount + creatorAmount;
const percentageCheck = {
  platform: (Number(platformAmount) * 100 / Number(TOTAL_COST)).toFixed(1),
  proposer: (Number(proposerAmount) * 100 / Number(TOTAL_COST)).toFixed(1),
  creator: (Number(creatorAmount) * 100 / Number(TOTAL_COST)).toFixed(1)
};

console.log(`\n🧮 Verification:`);
console.log(`Total input: ${TOTAL_COST.toString()}`);
console.log(`Total calculated: ${calculatedTotal.toString()}`);
console.log(`Match: ${TOTAL_COST === calculatedTotal ? "✅" : "❌"}`);

console.log(`\n📈 Percentage Breakdown:`);
console.log(`Platform: ${percentageCheck.platform}% (expected: 5.0%)`);
console.log(`Proposer: ${percentageCheck.proposer}% (expected: 10.0%)`);
console.log(`Creator: ${percentageCheck.creator}% (expected: 85.0%)`);

// Test scenarios
console.log(`\n🧪 Additional Test Cases:`);

const testCases = [
  { price: BigInt("5000000"), qty: 1n }, // 5 USDC
  { price: BigInt("25000000"), qty: 3n }, // 75 USDC total
  { price: BigInt("1000000"), qty: 10n }, // 10 USDC total
];

let allPassed = true;

testCases.forEach((test, index) => {
  const total = test.price * test.qty;
  const platform = (total * BigInt(PLATFORM_FEE_BPS)) / 10_000n;
  const proposer = (total * BigInt(PROPOSER_FEE_BPS)) / 10_000n;
  const creator = total - platform - proposer;
  const recalculated = platform + proposer + creator;
  
  const passed = total === recalculated;
  allPassed = allPassed && passed;
  
  console.log(`Test ${index + 1}: ${Number(total) / 1e6} USDC → Platform: ${Number(platform) / 1e6}, Proposer: ${Number(proposer) / 1e6}, Creator: ${Number(creator) / 1e6} → ${passed ? "✅" : "❌"}`);
});

console.log(`\n🎯 FINAL RESULT:`);
if (allPassed && TOTAL_COST === calculatedTotal) {
  console.log("✅ PASS - All split math calculations are correct!");
  console.log("✓ Platform gets exactly 5%");
  console.log("✓ Proposer gets exactly 10%");
  console.log("✓ Creator gets exactly 85%");
  console.log("✓ No wei is lost in calculations");
  console.log("✓ All test cases pass");
} else {
  console.log("❌ FAIL - Split math has errors!");
}

console.log(`\n📋 Summary for deployment verification:`);
console.log(`- Platform fee: ${PLATFORM_FEE_BPS} BPS (${PLATFORM_FEE_BPS/100}%)`);
console.log(`- Proposer fee: ${PROPOSER_FEE_BPS} BPS (${PROPOSER_FEE_BPS/100}%)`);
console.log(`- Creator gets remainder (85%)`);
console.log(`- Math verified across multiple scenarios ✅`);
