export function resolveCidToUrl(cid: string): string {
  if (!cid) return '';

  const trimmed = cid.trim();
  if (trimmed.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${trimmed.replace('ipfs://', '')}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('ipfs/')) {
    return `https://ipfs.io/${trimmed}`;
  }

  return `https://ipfs.io/ipfs/${trimmed}`;
}
