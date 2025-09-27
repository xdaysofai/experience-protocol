import { verifySelfIdentity } from '@xp/sdk';
import { publicClient } from './viemClient';

export interface AddressIdentity {
  address: `0x${string}`;
  ensName?: string | null;
  verified?: boolean;
  reason?: string;
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
    };
  } catch (err) {
    console.debug('Self identity lookup skipped:', (err as Error)?.message);
  }

  return {
    address: normalized,
    ensName,
  };
}

export function formatAddress(address: string, identity?: AddressIdentity | null): string {
  if (identity?.ensName) {
    return identity.ensName;
  }
  if (!address) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
