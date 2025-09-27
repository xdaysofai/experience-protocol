import { readFileSync } from 'fs';
import { ethers } from 'ethers';

// Load environment variables from parent directory
const envContent = readFileSync('../.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value;
  }
});

const PRIVATE_KEY = envVars.PRIVATE_KEY_DEPLOYER;
const RPC_URL = envVars.RPC_ETHEREUM_SEPOLIA || 'https://ethereum-sepolia-rpc.publicnode.com';
const USDC = envVars.USDC_SEPOLIA;
const WETH = envVars.WETH_SEPOLIA;
const DAI = envVars.DAI_SEPOLIA;

const EXPERIENCE_ADDRESS = process.env.EXPERIENCE || '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A';

const HUMAN_PRICES = {
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
  console.log('🔧 Configuring token prices for Experience Protocol');
  console.log('==================================================');
  console.log('Experience:', EXPERIENCE_ADDRESS);
  console.log('Network: Ethereum Sepolia');
  console.log('');

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Signer:', wallet.address);
  
  // Load Experience contract artifact
  const expArtifact = JSON.parse(readFileSync('./artifacts/contracts/Experience.sol/Experience.json', 'utf8'));
  const experience = new ethers.Contract(EXPERIENCE_ADDRESS, expArtifact.abi, wallet);
  
  async function configureToken(symbol, address, humanPrice, defaultDecimals) {
    if (!address) {
      console.log(`⏭️  Skip ${symbol}: no address`);
      return;
    }
    
    try {
      // Try to get decimals from token contract
      let decimals = defaultDecimals;
      try {
        const tokenContract = new ethers.Contract(address, ['function decimals() view returns (uint8)'], provider);
        decimals = await tokenContract.decimals();
      } catch {
        console.log(`⚠️  Using default decimals for ${symbol}: ${defaultDecimals}`);
      }
      
      const units = toUnits(humanPrice, Number(decimals));
      
      console.log(`💰 Setting ${symbol} @ ${address}`);
      console.log(`   Price: ${humanPrice} (${units.toString()} units with ${decimals} decimals)`);
      
      const tx = await experience.setTokenPrice(address, units, true);
      await tx.wait();
      
      console.log(`✅ ${symbol} configured successfully`);
      console.log('');
    } catch (error) {
      console.log(`❌ Error configuring ${symbol}:`, error.message);
      console.log('');
    }
  }
  
  await configureToken("USDC", USDC, HUMAN_PRICES.USDC, 6);
  await configureToken("WETH", WETH, HUMAN_PRICES.WETH, 18);
  await configureToken("DAI", DAI, HUMAN_PRICES.DAI, 18);
  
  console.log('🎉 Token price configuration complete!');
  console.log('');
  console.log('🔗 View your Experience on Etherscan:');
  console.log(`https://sepolia.etherscan.io/address/${EXPERIENCE_ADDRESS}`);
}

main().catch(console.error);
