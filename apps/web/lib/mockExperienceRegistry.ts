// Mock ExperienceRegistry service for local development
// This simulates the registry functionality until we can deploy to Sepolia

import { publicClient } from './viemClient';

export interface ExperienceInfo {
  address: string;
  creator: string;
  cid: string;
  createdAt: number;
  totalPurchases: number;
  totalRevenue: bigint;
}

export interface PurchaseInfo {
  purchaser: string;
  experience: string;
  quantity: number;
  timestamp: number;
  txHash: string;
}

export class MockExperienceRegistryService {
  private publicClient = publicClient;
  
  // Mock registry address (will be replaced with real address after deployment)
  private registryAddress = '0x0000000000000000000000000000000000000000' as `0x${string}`;

  async getCreatedExperiences(creator: string): Promise<ExperienceInfo[]> {
    // For now, return empty array - will be replaced with real registry calls
    console.log(`Mock registry: Getting created experiences for ${creator}`);
    return [];
  }

  async getPurchasedExperiences(purchaser: string): Promise<PurchaseInfo[]> {
    // For now, return empty array - will be replaced with real registry calls
    console.log(`Mock registry: Getting purchased experiences for ${purchaser}`);
    return [];
  }

  async getExperienceInfo(experience: string): Promise<ExperienceInfo | null> {
    // For now, return null - will be replaced with real registry calls
    console.log(`Mock registry: Getting experience info for ${experience}`);
    return null;
  }

  async hasPurchased(purchaser: string, experience: string): Promise<boolean> {
    // For now, return false - will be replaced with real registry calls
    console.log(`Mock registry: Checking if ${purchaser} purchased ${experience}`);
    return false;
  }

  async getTotalExperiences(): Promise<number> {
    // For now, return 0 - will be replaced with real registry calls
    console.log('Mock registry: Getting total experiences count');
    return 0;
  }

  async getAllExperiences(offset: number = 0, limit: number = 100): Promise<ExperienceInfo[]> {
    // For now, return empty array - will be replaced with real registry calls
    console.log(`Mock registry: Getting all experiences (offset: ${offset}, limit: ${limit})`);
    return [];
  }

  // Helper method to check if registry is deployed
  isRegistryDeployed(): boolean {
    return this.registryAddress !== '0x0000000000000000000000000000000000000000';
  }

  // Method to update registry address after deployment
  setRegistryAddress(address: string) {
    this.registryAddress = address as `0x${string}`;
    console.log(`Mock registry: Updated registry address to ${address}`);
  }
}

// Export singleton instance
export const mockExperienceRegistryService = new MockExperienceRegistryService();

// Export the same interface as the real registry service for compatibility
export const experienceRegistryService = mockExperienceRegistryService;
