// EIP-6963 provider discovery with fallback
export async function getInjectedProvider(): Promise<any> {
  if (typeof window === "undefined") return undefined;

  let selected: any;

  // EIP-6963 discovery
  const candidates: any[] = [];
  
  function onAnnounce(e: any) {
    const detail = e.detail;
    if (detail?.provider) {
      candidates.push({
        provider: detail.provider,
        info: detail.info
      });
    }
  }

  // Listen for provider announcements
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  
  // Request providers to announce themselves
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  
  // Wait for providers to respond
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Clean up listener
  window.removeEventListener("eip6963:announceProvider", onAnnounce);

  if (candidates.length > 0) {
    console.log(`Found ${candidates.length} EIP-6963 providers:`, candidates.map(c => c.info?.name || 'Unknown'));
    
    // Prioritize MetaMask by name/uuid
    selected = candidates.find((c: any) => 
      c.info?.name?.toLowerCase().includes('metamask') ||
      c.info?.uuid === 'io.metamask'
    );
    
    if (selected) {
      console.log('Selected MetaMask via EIP-6963:', selected.info?.name);
      return selected.provider;
    }
    
    // Fallback to first available provider
    selected = candidates[0];
    console.log('Selected first available provider:', selected.info?.name);
    return selected.provider;
  }

  // Legacy fallback to window.ethereum
  console.log('No EIP-6963 providers found, falling back to window.ethereum');
  return (window as any).ethereum;
}