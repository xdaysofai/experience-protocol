import { verifySelfIdentity } from '@xp/sdk';
import { publicClient } from './viemClient';

export interface AddressIdentity {
  address: `0x${string}`;
  ensName?: string | null;
  verified?: boolean;
  reason?: string;
  reputation?: number;
  badges?: string[];
  socialProofs?: {
    twitter?: string;
    github?: string;
    discord?: string;
  };
  source?: 'ens' | 'self' | 'fallback';
}

export async function resolveAddressIdentity(address?: string): Promise<AddressIdentity | null> {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  const normalized = address as `0x${string}`;
  let ensName: string | null = null;

  try {
    ensName = await publicClient.getEnsName({ address: normalized });
  } catch (err) {
    // Sepolia may not support ENS; ignore silently
    console.debug('ENS lookup skipped:', (err as Error)?.message);
  }

  try {
    const result = await verifySelfIdentity(normalized);
    return {
      address: normalized,
      ensName,
      verified: result?.eligible ?? false,
      reason: result?.reason,
      reputation: result?.eligible ? 75 : 0,
      badges: result?.eligible ? ['self'] : [],
      socialProofs: {},
      source: 'self',
    };
  } catch (err) {
    console.debug('Self identity lookup skipped:', (err as Error)?.message);
  }

  return {
    address: normalized,
    ensName,
    verified: !!ensName,
    reputation: ensName ? 50 : 0,
    badges: ensName ? ['ens'] : [],
    socialProofs: {},
    source: ensName ? 'ens' : 'fallback',
  };
}

export function formatAddress(address: string, identity?: AddressIdentity | null): string {
  if (identity?.ensName) {
    return identity.ensName;
  }
  if (!address) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Get reputation badge
export function getReputationBadge(reputation?: number): string {
  if (!reputation) return '⭐';
  if (reputation >= 90) return '🏆';
  if (reputation >= 75) return '🥇';
  if (reputation >= 50) return '🥈';
  if (reputation >= 25) return '🥉';
  return '⭐';
}

// Get verification status
export function getVerificationStatus(identity: AddressIdentity): string {
  if (identity.source === 'self' && identity.verified) {
    return 'Self Protocol Verified';
  }
  if (identity.source === 'ens' && identity.ensName) {
    return 'ENS Verified';
  }
  return 'Unverified';
}

// Check if address has high reputation
export function isHighReputation(identity: AddressIdentity): boolean {
  return (identity.reputation || 0) >= 75;
}

// Get social proof links
export function getSocialProofLinks(identity: AddressIdentity): Array<{platform: string, url: string}> {
  const links: Array<{platform: string, url: string}> = [];
  
  if (identity.socialProofs?.twitter) {
    links.push({
      platform: 'Twitter',
      url: `https://twitter.com/${identity.socialProofs.twitter}`
    });
  }
  
  if (identity.socialProofs?.github) {
    links.push({
      platform: 'GitHub',
      url: `https://github.com/${identity.socialProofs.github}`
    });
  }
  
  if (identity.socialProofs?.discord) {
    links.push({
      platform: 'Discord',
      url: identity.socialProofs.discord
    });
  }
  
  return links;
}
