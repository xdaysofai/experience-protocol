import { resolveCidToUrl } from './ipfs';

export interface ExperienceMetadata {
  name: string;
  description: string;
  raw: Record<string, any> | null;
}

export async function fetchExperienceMetadata(
  cid: string,
  signal?: AbortSignal
): Promise<ExperienceMetadata | null> {
  if (!cid) return null;

  try {
    const url = resolveCidToUrl(cid);
    if (!url) return null;

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Metadata fetch failed (${response.status})`);
    }

    const data = await response.json();
    const name = data?.name || data?.title || 'Experience Pass';
    const description = data?.description || data?.summary || '';

    return {
      name,
      description,
      raw: data,
    };
  } catch (err) {
    if ((err as any)?.name === 'AbortError') return null;
    console.warn('fetchExperienceMetadata failed:', err);
    return null;
  }
}
