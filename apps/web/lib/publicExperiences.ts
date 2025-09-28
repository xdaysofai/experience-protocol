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
  // First try registry if available
  if (experienceRegistryService.isAvailable()) {
    try {
      return await fetchFromRegistry(limit);
    } catch (err) {
      console.warn('Registry fetch failed, falling back to factory events:', err);
    }
  }
  
  // Fallback: Fetch from factory events if registry is not available
  return await fetchFromFactoryEvents(limit);
}

async function fetchFromRegistry(limit: number): Promise<DiscoverExperience[]> {
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
}

async function fetchFromFactoryEvents(limit: number): Promise<DiscoverExperience[]> {
  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
  if (!factoryAddress) {
    console.warn('No factory address configured, cannot fetch experiences');
    return [];
  }

  try {
    console.log('Fetching experiences from factory events...');
    
    // Factory ABI for ExperienceCreated event
    const factoryAbi = [
      {
        "type": "event",
        "name": "ExperienceCreated",
        "inputs": [
          {"name": "experience", "type": "address", "indexed": true},
          {"name": "creator", "type": "address", "indexed": true},
          {"name": "cid", "type": "string", "indexed": false}
        ]
      }
    ] as const;

    // Get ExperienceCreated events
    const logs = await publicClient.getLogs({
      address: factoryAddress,
      event: factoryAbi[0],
      fromBlock: 'earliest',
      toBlock: 'latest'
    });

    console.log(`Found ${logs.length} experience creation events`);

    const experiences: DiscoverExperience[] = [];
    const sortedLogs = logs.slice(-limit); // Get most recent experiences

    for (const log of sortedLogs) {
      try {
        const experienceAddress = log.args.experience;
        if (!experienceAddress) continue;

        // Get contract data
        const [owner, priceEthWei, cid, proposer] = await Promise.all([
          publicClient.readContract({
            address: experienceAddress,
            abi: ExperienceAbi.abi,
            functionName: 'owner',
          }),
          publicClient.readContract({
            address: experienceAddress,
            abi: ExperienceAbi.abi,
            functionName: 'priceEthWei',
          }).catch(() => 0n),
          publicClient.readContract({
            address: experienceAddress,
            abi: ExperienceAbi.abi,
            functionName: 'cid',
          }).catch(() => ''),
          publicClient.readContract({
            address: experienceAddress,
            abi: ExperienceAbi.abi,
            functionName: 'currentProposer',
          }).catch(() => null),
        ]);

        const metadata = cid ? await fetchExperienceMetadata(cid as string).catch(() => null) : null;
        const raw = metadata?.raw ?? {};

        const location = extractMetadataField<string>((raw as any)?.location, '');
        const tags = extractMetadataField<string[]>((raw as any)?.tags, []);

        experiences.push({
          address: experienceAddress,
          owner: owner as `0x${string}`,
          priceEth: formatEther(priceEthWei as bigint),
          createdAt: Number(log.blockNumber || 0),
          active: (priceEthWei as bigint) > 0n,
          proposer: proposer ? (proposer as `0x${string}`) : null,
          cid: cid as string,
          name: metadata?.name || `Experience ${experienceAddress.slice(0, 8)}...`,
          summary: metadata?.description || 'A token-gated experience.',
          location: location || undefined,
          tags,
        });
      } catch (err) {
        console.warn('Failed to load experience from factory event:', log.args.experience, err);
      }
    }

    console.log(`Successfully loaded ${experiences.length} experiences from factory events`);
    return experiences.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Factory events fetch failed:', err);
    return [];
  }
}
