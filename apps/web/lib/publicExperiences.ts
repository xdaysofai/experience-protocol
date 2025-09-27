import { formatEther } from 'viem';
import ExperienceAbi from '../abi/Experience.json';
import { experienceRegistryService } from './experienceRegistry';
import { publicClient } from './viemClient';
import { fetchExperienceMetadata } from './experienceMetadata';

export interface DiscoverExperience {
  address: `0x${string}`;
  owner: `0x${string}`;
  priceEth: string;
  createdAt: number;
  active: boolean;
  proposer?: `0x${string}` | null;
  cid: string;
  name: string;
  summary: string;
  location?: string;
  tags: string[];
}

function extractMetadataField<T>(value: unknown, fallback: T): T {
  if (typeof fallback === 'string') {
    return typeof value === 'string' && value.length > 0 ? (value as T) : fallback;
  }
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? (value as T) : fallback;
  }
  return fallback;
}

export async function fetchDiscoverExperiences(limit = 12): Promise<DiscoverExperience[]> {
  if (!experienceRegistryService.isAvailable()) {
    return [];
  }

  try {
    const total = await experienceRegistryService.getTotalExperiences();
    if (total === 0) return [];

    const fetchCount = Math.min(limit, total);
    const addresses = await experienceRegistryService.getAllExperiences(0, fetchCount);

    const experiences: DiscoverExperience[] = [];

    for (const address of addresses) {
      try {
        const info = await experienceRegistryService.getExperienceInfo(address);
        const [owner, priceEthWei, proposer] = await Promise.all([
          publicClient.readContract({
            address: address as `0x${string}`,
            abi: ExperienceAbi.abi,
            functionName: 'owner',
          }),
          publicClient.readContract({
            address: address as `0x${string}`,
            abi: ExperienceAbi.abi,
            functionName: 'priceEthWei',
          }),
          publicClient.readContract({
            address: address as `0x${string}`,
            abi: ExperienceAbi.abi,
            functionName: 'currentProposer',
          }).catch(() => null),
        ]);

        const metadata = info.cid ? await fetchExperienceMetadata(info.cid).catch(() => null) : null;
        const raw = metadata?.raw ?? {};

        const location = extractMetadataField<string>((raw as any)?.location, '');
        const tags = extractMetadataField<string[]>((raw as any)?.tags, []);

        experiences.push({
          address: address as `0x${string}`,
          owner: owner as `0x${string}`,
          priceEth: formatEther(priceEthWei as bigint),
          createdAt: Number(info.createdAt ?? 0n),
          active: Boolean(info.active),
          proposer: proposer ? (proposer as `0x${string}`) : null,
          cid: info.cid,
          name: metadata?.name || 'Experience',
          summary: metadata?.description || '',
          location: location || undefined,
          tags,
        });
      } catch (err) {
        console.warn('Failed to load experience for home page:', address, err);
      }
    }

    return experiences.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Discover experiences load failed:', err);
    return [];
  }
}
