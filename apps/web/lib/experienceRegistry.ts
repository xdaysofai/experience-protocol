import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC || 'https://ethereum-sepolia-rpc.publicnode.com'),
});

export const REGISTRY_ABI = [
  {
    "type": "function",
    "name": "getCreatedExperiences",
    "inputs": [{"name": "_creator", "type": "address"}],
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function", 
    "name": "getPurchasedExperiences",
    "inputs": [{"name": "_purchaser", "type": "address"}],
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getExperienceInfo", 
    "inputs": [{"name": "_experience", "type": "address"}],
    "outputs": [{
      "name": "",
      "type": "tuple",
      "components": [
        {"name": "experience", "type": "address"},
        {"name": "creator", "type": "address"}, 
        {"name": "cid", "type": "string"},
        {"name": "createdAt", "type": "uint256"},
        {"name": "active", "type": "bool"}
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPurchaseInfo",
    "inputs": [
      {"name": "_experience", "type": "address"},
      {"name": "_purchaser", "type": "address"}
    ],
    "outputs": [{
      "name": "",
      "type": "tuple", 
      "components": [
        {"name": "experience", "type": "address"},
        {"name": "purchaser", "type": "address"},
        {"name": "totalQuantity", "type": "uint256"},
        {"name": "firstPurchaseAt", "type": "uint256"},
        {"name": "lastPurchaseAt", "type": "uint256"}
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCreatedExperiencesCount",
    "inputs": [{"name": "_creator", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPurchasedExperiencesCount", 
    "inputs": [{"name": "_purchaser", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTotalExperiences",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAllExperiences",
    "inputs": [
      {"name": "_offset", "type": "uint256"},
      {"name": "_limit", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isExperienceRegistered",
    "inputs": [{"name": "_experience", "type": "address"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasPurchased",
    "inputs": [
      {"name": "_experience", "type": "address"},
      {"name": "_purchaser", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  }
] as const;

export interface ExperienceInfo {
  experience: string;
  creator: string;
  cid: string;
  createdAt: bigint;
  active: boolean;
}

export interface PurchaseInfo {
  experience: string;
  purchaser: string;
  totalQuantity: bigint;
  firstPurchaseAt: bigint;
  lastPurchaseAt: bigint;
}

export class ExperienceRegistryService {
  private registryAddress: `0x${string}` | null;

  constructor(registryAddress?: string) {
    this.registryAddress = (registryAddress as `0x${string}`) || 
      (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`) ||
      null;
  }

  setRegistryAddress(address: string) {
    this.registryAddress = address as `0x${string}`;
  }

  getRegistryAddress(): `0x${string}` | null {
    return this.registryAddress;
  }

  isAvailable(): boolean {
    return Boolean(this.registryAddress);
  }

  async getCreatedExperiences(creator: string): Promise<string[]> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getCreatedExperiences',
      args: [creator as `0x${string}`]
    });

    return result as string[];
  }

  async getPurchasedExperiences(purchaser: string): Promise<string[]> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getPurchasedExperiences',
      args: [purchaser as `0x${string}`]
    });

    return result as string[];
  }

  async getExperienceInfo(experience: string): Promise<ExperienceInfo> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getExperienceInfo',
      args: [experience as `0x${string}`]
    });

    const info = result as any;
    return {
      experience: info.experience,
      creator: info.creator,
      cid: info.cid,
      createdAt: info.createdAt,
      active: info.active
    };
  }

  async getPurchaseInfo(experience: string, purchaser: string): Promise<PurchaseInfo> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getPurchaseInfo',
      args: [experience as `0x${string}`, purchaser as `0x${string}`]
    });

    const info = result as any;
    return {
      experience: info.experience,
      purchaser: info.purchaser,
      totalQuantity: info.totalQuantity,
      firstPurchaseAt: info.firstPurchaseAt,
      lastPurchaseAt: info.lastPurchaseAt
    };
  }

  async getCreatedExperiencesCount(creator: string): Promise<number> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getCreatedExperiencesCount',
      args: [creator as `0x${string}`]
    });

    return Number(result);
  }

  async getPurchasedExperiencesCount(purchaser: string): Promise<number> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getPurchasedExperiencesCount',
      args: [purchaser as `0x${string}`]
    });

    return Number(result);
  }

  async getTotalExperiences(): Promise<number> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getTotalExperiences',
      args: []
    });

    return Number(result);
  }

  async getAllExperiences(offset: number = 0, limit: number = 100): Promise<string[]> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getAllExperiences',
      args: [BigInt(offset), BigInt(limit)]
    });

    return result as string[];
  }

  async isExperienceRegistered(experience: string): Promise<boolean> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'isExperienceRegistered',
      args: [experience as `0x${string}`]
    });

    return result as boolean;
  }

  async hasPurchased(experience: string, purchaser: string): Promise<boolean> {
    if (!this.registryAddress) throw new Error('Registry not configured');

    const result = await publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'hasPurchased',
      args: [experience as `0x${string}`, purchaser as `0x${string}`]
    });

    return result as boolean;
  }
}

// Export singleton instance
export const experienceRegistryService = new ExperienceRegistryService();
