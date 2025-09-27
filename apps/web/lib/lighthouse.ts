import lighthouse from '@lighthouse-web3/sdk';

// Types for our experience index
export interface ExperienceIndex {
  address: string;
  creator: string;
  cid: string;
  createdAt: number;
  deployTxHash?: string;
  metadata?: {
    title?: string;
    description?: string;
    categories?: string[];
    location?: string;
    priceEth?: string;
  };
}

export interface CreatorExperienceList {
  wallet: string;
  experiences: ExperienceIndex[];
  lastUpdated: number;
  version: number;
}

class LighthouseService {
  private apiKey: string | null = null;
  
  constructor() {
    // Set the platform API key
    this.apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || 'bc7f3123.5e11a21851e74fd3a1f8bbc6faa5eed0';
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  async uploadText(text: string, filename: string = 'data.json'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Lighthouse API key not set');
    }

    try {
      const response = await lighthouse.uploadText(text, this.apiKey, filename);
      return response.data.Hash;
    } catch (error: any) {
      console.error('Lighthouse upload error:', error);
      throw new Error('Failed to upload to Lighthouse: ' + error.message);
    }
  }

  async downloadText(hash: string): Promise<string> {
    try {
      // Download from Lighthouse gateway
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error: any) {
      console.error('Lighthouse download error:', error);
      throw new Error('Failed to download from Lighthouse: ' + error.message);
    }
  }

  async saveCreatorExperienceList(wallet: string, experiences: ExperienceIndex[]): Promise<string> {
    const data: CreatorExperienceList = {
      wallet: wallet.toLowerCase(),
      experiences,
      lastUpdated: Date.now(),
      version: 1
    };

    const jsonData = JSON.stringify(data, null, 2);
    const filename = `creator-experiences-${wallet.toLowerCase()}.json`;
    
    return await this.uploadText(jsonData, filename);
  }

  async loadCreatorExperienceList(hash: string): Promise<CreatorExperienceList> {
    const jsonData = await this.downloadText(hash);
    return JSON.parse(jsonData) as CreatorExperienceList;
  }

  async addExperienceToList(
    wallet: string, 
    newExperience: ExperienceIndex, 
    currentHash?: string
  ): Promise<string> {
    let experiences: ExperienceIndex[] = [];
    
    // Load existing list if hash provided
    if (currentHash) {
      try {
        const existing = await this.loadCreatorExperienceList(currentHash);
        experiences = existing.experiences || [];
      } catch (error) {
        console.warn('Could not load existing experience list, starting fresh');
      }
    }

    // Check if experience already exists
    const existingIndex = experiences.findIndex(
      exp => exp.address.toLowerCase() === newExperience.address.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing experience
      experiences[existingIndex] = { ...experiences[existingIndex], ...newExperience };
    } else {
      // Add new experience
      experiences.push(newExperience);
    }

    // Sort by creation time (newest first)
    experiences.sort((a, b) => b.createdAt - a.createdAt);

    return await this.saveCreatorExperienceList(wallet, experiences);
  }

  // Generate a consistent storage key for a wallet's experience list
  generateStorageKey(wallet: string): string {
    return `lighthouse-experiences-${wallet.toLowerCase()}`;
  }

  // Save hash to localStorage for quick access
  saveHashToLocalStorage(wallet: string, hash: string) {
    try {
      const key = this.generateStorageKey(wallet);
      localStorage.setItem(key, hash);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // Load hash from localStorage
  loadHashFromLocalStorage(wallet: string): string | null {
    try {
      const key = this.generateStorageKey(wallet);
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  }

  // Clear localStorage for a wallet
  clearLocalStorage(wallet: string) {
    try {
      const key = this.generateStorageKey(wallet);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

// Export singleton instance
export const lighthouseService = new LighthouseService();

// Helper function to check if Lighthouse is available
export function isLighthouseAvailable(): boolean {
  return Boolean(lighthouseService.getApiKey());
}

// Helper to prompt user for API key
export function promptForApiKey(): string | null {
  const apiKey = prompt(
    'Enter your Lighthouse API Key to enable experience syncing across devices.\n\n' +
    'Get your free API key at: https://www.lighthouse.storage/\n\n' +
    'You can also set NEXT_PUBLIC_LIGHTHOUSE_API_KEY in your environment.'
  );
  
  if (apiKey) {
    lighthouseService.setApiKey(apiKey.trim());
    return apiKey.trim();
  }
  
  return null;
}
