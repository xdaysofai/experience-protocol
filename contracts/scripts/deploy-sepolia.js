import "dotenv/config";
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const platformWallet = process.env.PLATFORM_WALLET;
  const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || "500", 10);

  console.log("Deploying to Ethereum Sepolia...");
  console.log("Platform wallet:", platformWallet);
  console.log("Platform fee:", platformFeeBps, "bps");

  const Factory = await hre.ethers.getContractFactory("ExperienceFactory");
  const factory = await Factory.deploy(platformWallet, platformFeeBps);
  await factory.waitForDeployment();

  console.log("ExperienceFactory deployed:", await factory.getAddress());

  // Optional: deploy one demo Experience now (creator = deployer, empty flowSyncAuthority)
  const creator = deployer.address;
  const cidInitial = "demo-cid";
  const flowSyncAuthority = deployer.address; // stub; replace later with relayer address

  console.log("Creating demo Experience...");
  const tx = await factory.createExperience(creator, cidInitial, flowSyncAuthority, 1000);
  const rc = await tx.wait();
  const ev = rc.logs.find(l => l.fragment && l.fragment.name === "ExperienceCreated");
  const experience = ev ? ev.args.experience : null;

  console.log("Experience (demo) deployed:", experience);
  console.log("");
  console.log("🎉 Deployment successful to Ethereum Sepolia!");
  console.log("📝 Update your .env.local with:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${await factory.getAddress()}`);
  console.log(`NEXT_PUBLIC_EXPERIENCE_ADDRESS=${experience}`);
  console.log("");
  console.log("🔗 Verify on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${await factory.getAddress()}`);
  console.log(`https://sepolia.etherscan.io/address/${experience}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
