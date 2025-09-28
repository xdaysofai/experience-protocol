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
          { "name": "creator", "type": "address", "indexed": true },
          { "name": "experience", "type": "address", "indexed": false },
          { "name": "cidInitial", "type": "string", "indexed": false },
          { "name": "flowSyncAuthority", "type": "address", "indexed": false },
          { "name": "proposerFeeBps", "type": "uint16", "indexed": false }
        ]
      }
    ] as const;

    const CHUNK_SIZE = 50_000n;
    const SAFETY_MULTIPLIER = 3;
    const BATCH_SIZE = 5;
    const INITIAL_LOOKBACK = 250_000n;
    const MAX_LOOKBACK_BLOCKS = 1_000_000n;

    type FactoryLog = Awaited<ReturnType<typeof publicClient.getLogs>> extends Array<infer Item>
      ? Item
      : never;

    const latestBlock = await publicClient.getBlockNumber();
    const logs: FactoryLog[] = [];
    const desiredLogCount = Math.max(limit * SAFETY_MULTIPLIER, limit + 4);

    const windows: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
    let cursor: bigint = latestBlock;
    let lookback: bigint = INITIAL_LOOKBACK;

    const pushWindows = (targetMinBlock: bigint) => {
      if (cursor < targetMinBlock) {
        return;
      }

      while (cursor >= targetMinBlock) {
        const rawFrom = cursor >= CHUNK_SIZE ? cursor - CHUNK_SIZE + 1n : 0n;
        const fromBlock = rawFrom >= targetMinBlock ? rawFrom : targetMinBlock;
        windows.push({ fromBlock, toBlock: cursor });

        if (fromBlock === targetMinBlock) {
          cursor = fromBlock > 0n ? fromBlock - 1n : -1n;
          break;
        }

        cursor = fromBlock - 1n;
      }
    };

    const initialMinBlock = latestBlock > lookback ? latestBlock - lookback : 0n;
    pushWindows(initialMinBlock);

    for (let i = 0; i < windows.length && logs.length < desiredLogCount; i += BATCH_SIZE) {
      const batch = windows.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async ({ fromBlock, toBlock }) => {
          try {
            return await publicClient.getLogs({
              address: factoryAddress,
              event: factoryAbi[0],
              fromBlock,
              toBlock,
            });
          } catch (err) {
            console.warn('Factory events chunk failed', { fromBlock: fromBlock.toString(), toBlock: toBlock.toString(), err });
            return [] as FactoryLog[];
          }
        })
      );

      for (const chunk of results) {
        if (chunk.length > 0) {
          logs.unshift(...chunk);
        }
      }

      if (i + BATCH_SIZE >= windows.length && logs.length < desiredLogCount && lookback < MAX_LOOKBACK_BLOCKS && cursor >= 0n) {
        lookback = lookback * 2n;
        if (lookback > MAX_LOOKBACK_BLOCKS) {
          lookback = MAX_LOOKBACK_BLOCKS;
        }
        const nextMinBlock = latestBlock > lookback ? latestBlock - lookback : 0n;
        pushWindows(nextMinBlock);
      }
    }

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
