import "dotenv/config";
import hre from "hardhat";

const HUMAN_PRICES = {
  // FIRST experience demo prices:
  USDC: "10.00",   // 6 decimals
  WETH: "0.003",   // 18 decimals
  DAI:  "10.00"    // 18 decimals
};

function toUnits(human, decimals) {
  const [whole, frac=""] = human.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + fracPadded);
}

async function main() {
  const experience = process.env.EXPERIENCE;
  if (!experience) throw new Error("Set EXPERIENCE=0x... in env");

  const USDC = process.env.USDC_AMOY || "";
  const WETH = process.env.WETH_AMOY || "";
  const DAI  = process.env.DAI_AMOY  || "";

  const Exp = await hre.ethers.getContractFactory("Experience");
  const exp = Exp.attach(experience);

  const signer = (await hre.ethers.getSigners())[0];
  console.log("Signer:", signer.address);
  console.log("Experience:", experience);

  async function cfgToken(sym, addr, humanDefault, defaultDecimals) {
    if (!addr) { console.log(`Skip ${sym}: no address`); return; }
    const erc20 = await hre.ethers.getContractAt("IERC20", addr);
    let decimals = defaultDecimals;
    try { decimals = await erc20.decimals(); } catch { /* fallback */ }
    const units = toUnits(humanDefault, Number(decimals));
    const tx = await exp.setTokenPrice(addr, units, true);
    await tx.wait();
    console.log(`Set ${sym} @ ${addr} price ${humanDefault} (decimals=${decimals}) -> ${units.toString()}`);
  }

  await cfgToken("USDC", USDC, HUMAN_PRICES.USDC, 6);
  await cfgToken("WETH", WETH, HUMAN_PRICES.WETH, 18);
  await cfgToken("DAI",  DAI,  HUMAN_PRICES.DAI,  18);

  console.log("Done.");
}

main().catch((e)=>{ console.error(e); process.exit(1); });
