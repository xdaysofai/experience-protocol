import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";

const AMOY = process.env.RPC_POLYGON_AMOY || "https://rpc-amoy.polygon.technology";
const SEPOLIA = process.env.RPC_ETHEREUM_SEPOLIA || "https://rpc.sepolia.org";
const PK = process.env.PRIVATE_KEY_DEPLOYER || "";
console.log("Private key loaded:", PK ? "✅ Yes" : "❌ No");

const config = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  defaultNetwork: "hardhat",
  networks: {
    amoy: {
      url: AMOY,
      accounts: PK ? [`0x${PK}`] : []
    },
    sepolia: {
      url: SEPOLIA,
      accounts: PK ? [PK] : []
    }
  }
};

export default config;
