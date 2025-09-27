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

export interface PurchaseIndex {
  experience: string;
  purchaser: string;
  totalQuantity: number;
  lastPurchaseAt: number;
  lastTxHash?: string;
  creator?: string;
  cid?: string;
  priceEth?: string;
}

export interface CreatorExperienceList {
  wallet: string;
  experiences: ExperienceIndex[];
  lastUpdated: number;
  version: number;
}

export interface PurchasedExperienceList {
  wallet: string;
  purchases: PurchaseIndex[];
  lastUpdated: number;
  version: number;
}

class LighthouseService {
  private apiKey: string | null = null;
  
  constructor() {
    // Set the platform API key - users don't need to provide their own
    this.apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || 'bc7f3123.5e11a21851e74fd3a1f8bbc6faa5eed0';
    console.log('🌊 Lighthouse service initialized with platform API key');
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

  async savePurchasedExperienceList(wallet: string, purchases: PurchaseIndex[]): Promise<string> {
    const data: PurchasedExperienceList = {
      wallet: wallet.toLowerCase(),
      purchases,
      lastUpdated: Date.now(),
      version: 1
    };

    const jsonData = JSON.stringify(data, null, 2);
    const filename = `purchased-experiences-${wallet.toLowerCase()}.json`;

    return await this.uploadText(jsonData, filename);
  }

  async loadPurchasedExperienceList(hash: string): Promise<PurchasedExperienceList> {
    const jsonData = await this.downloadText(hash);
    return JSON.parse(jsonData) as PurchasedExperienceList;
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

  async addPurchaseToList(
    wallet: string,
    purchase: PurchaseIndex,
    currentHash?: string
  ): Promise<string> {
    let purchases: PurchaseIndex[] = [];

    if (currentHash) {
      try {
        const existing = await this.loadPurchasedExperienceList(currentHash);
        purchases = existing.purchases || [];
      } catch (error) {
        console.warn('Could not load existing purchase list, starting fresh');
      }
    }

    const idx = purchases.findIndex(
      (p) => p.experience.toLowerCase() === purchase.experience.toLowerCase()
    );

    if (idx >= 0) {
      const existing = purchases[idx];
      purchases[idx] = {
        ...existing,
        totalQuantity: existing.totalQuantity + purchase.totalQuantity,
        lastPurchaseAt: purchase.lastPurchaseAt,
        lastTxHash: purchase.lastTxHash || existing.lastTxHash,
        cid: purchase.cid || existing.cid,
        priceEth: purchase.priceEth || existing.priceEth,
        creator: purchase.creator || existing.creator,
      };
    } else {
      purchases.push(purchase);
    }

    purchases.sort((a, b) => b.lastPurchaseAt - a.lastPurchaseAt);

    return await this.savePurchasedExperienceList(wallet, purchases);
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

  generatePurchaseStorageKey(wallet: string): string {
    return `lighthouse-purchases-${wallet.toLowerCase()}`;
  }

  savePurchaseHashToLocalStorage(wallet: string, hash: string) {
    try {
      const key = this.generatePurchaseStorageKey(wallet);
      localStorage.setItem(key, hash);
    } catch (error) {
      console.warn('Failed to save purchase hash:', error);
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

  loadPurchaseHashFromLocalStorage(wallet: string): string | null {
    try {
      const key = this.generatePurchaseStorageKey(wallet);
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to load purchase hash:', error);
      return null;
    }
  }

  // Clear localStorage for a wallet
  clearLocalStorage(wallet: string) {
    try {
      const key = this.generateStorageKey(wallet);
      localStorage.removeItem(key);
      const purchaseKey = this.generatePurchaseStorageKey(wallet);
      localStorage.removeItem(purchaseKey);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

// Export singleton instance
export const lighthouseService = new LighthouseService();

// Helper function to check if Lighthouse is available
export function isLighthouseAvailable(): boolean {
  // Lighthouse is always available with platform API key
  return true;
}

// Helper to get platform API key info (no user input needed)
export function getLighthouseInfo(): { available: boolean; isPlatformKey: boolean } {
  const apiKey = lighthouseService.getApiKey();
  return {
    available: Boolean(apiKey),
    isPlatformKey: apiKey === 'bc7f3123.5e11a21851e74fd3a1f8bbc6faa5eed0'
  };
}
