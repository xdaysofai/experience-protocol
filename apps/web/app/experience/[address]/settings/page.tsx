"use client";
import { useState, useEffect } from 'react';
import { createWalletClient, custom, formatEther, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import ExperienceAbi from '../../../../abi/Experience.json';
import { getInjectedProvider } from '../../../../lib/provider';
import { publicClient } from '../../../../lib/viemClient';
import { resolveAddressIdentity, formatAddress, AddressIdentity } from '../../../../lib/identity';

export default function SettingsPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const [account, setAccount] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [priceEthWei, setPriceEthWei] = useState<bigint>(0n);
  const [newPrice, setNewPrice] = useState<string>('');
  const [cid, setCid] = useState<string>('');
  const [currentProposer, setCurrentProposer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(500);
  const [proposerFeeBps, setProposerFeeBps] = useState<number>(1000);
  const [ownerIdentity, setOwnerIdentity] = useState<AddressIdentity | null>(null);
  const [proposerIdentity, setProposerIdentity] = useState<AddressIdentity | null>(null);

  const isOwner = account && owner && account.toLowerCase() === owner.toLowerCase();
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const salesPaused = priceEthWei === 0n;
  const creatorShareBps = Math.max(0, 10_000 - platformFeeBps - proposerFeeBps);
  const hasProposer = Boolean(currentProposer && currentProposer !== ZERO_ADDRESS);

  useEffect(() => {
    loadContractData();
    connectWallet();
  }, [experience]);

  useEffect(() => {
    let cancelled = false;

    async function resolveOwner() {
      if (!owner) {
        setOwnerIdentity(null);
        return;
      }
      const identity = await resolveAddressIdentity(owner);
      if (!cancelled) {
        setOwnerIdentity(identity);
      }
    }

    resolveOwner();

    return () => {
      cancelled = true;
    };
  }, [owner]);

  useEffect(() => {
    let cancelled = false;

    async function resolveProposer() {
      if (!currentProposer) {
        setProposerIdentity(null);
        return;
      }
      const identity = await resolveAddressIdentity(currentProposer);
      if (!cancelled) {
        setProposerIdentity(identity);
      }
    }

    resolveProposer();

    return () => {
      cancelled = true;
    };
  }, [currentProposer]);

  async function loadContractData() {
    try {
      const [ownerData, price, cidData, proposer, platformBps, proposerBps] = await Promise.all([
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: 'owner',
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: 'priceEthWei',
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: 'cid',
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: 'currentProposer',
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: 'PLATFORM_FEE_BPS',
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: 'proposerFeeBps',
        }),
      ]);

      setOwner(ownerData as string);
      setPriceEthWei(price as bigint);
      setCid(cidData as string);
      setCurrentProposer(proposer as string);
      setNewPrice(formatEther(price as bigint));
      setPlatformFeeBps(Number(platformBps));
      setProposerFeeBps(Number(proposerBps));
    } catch (err) {
      console.error('Failed to load contract data:', err);
      setError('Failed to load contract data');
    }
  }

  async function connectWallet() {
    try {
      const provider = await getInjectedProvider();
      const [account] = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(account);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  }

  async function updatePrice() {
    if (!isOwner) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const priceWei = parseEther(newPrice);
      
      const provider = await getInjectedProvider();
      const walletClient = createWalletClient({ chain: sepolia, transport: custom(provider) });
      
      const { request } = await publicClient.simulateContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'setPriceEthWei',
        args: [priceWei],
        account: account as `0x${string}`,
      });
      
      const hash = await walletClient.writeContract(request);
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      
      setPriceEthWei(priceWei);
      setSuccess(`Price updated to ${newPrice} ETH`);
      
    } catch (err: any) {
      console.error('Price update failed:', err);
      setError(err.message || 'Failed to update price');
    } finally {
      setLoading(false);
    }
  }

  async function pauseSales() {
    if (!isOwner || !account) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const provider = await getInjectedProvider();
      const walletClient = createWalletClient({ chain: sepolia, transport: custom(provider) });

      const { request } = await publicClient.simulateContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'setPriceEthWei',
        args: [0n],
        account: account as `0x${string}`,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      setPriceEthWei(0n);
      setNewPrice('0');
      setSuccess('Sales paused (price set to 0)');
    } catch (err: any) {
      setError(err.message || 'Failed to pause sales');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Experience Settings</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Contract Info</h3>
        <p><strong>Experience:</strong> {experience}</p>
        <p>
          <strong>Owner:</strong>{' '}
          <span title={owner}>{formatAddress(owner, ownerIdentity)}</span>
          {ownerIdentity?.verified && <span style={{ marginLeft: '6px', color: '#0f766e' }}>✅</span>}
        </p>
        <p><strong>Connected Account:</strong> {account || 'Not connected'}</p>
        <p><strong>Access Level:</strong> {isOwner ? '✅ Owner' : '❌ Read-only'}</p>
        <p><strong>Sales Status:</strong> {salesPaused ? '⏸️ Paused (price = 0)' : '🟢 Active'}</p>
        <p>
          <strong>Revenue Split:</strong>{' '}
          Creator {(creatorShareBps / 100).toFixed(2)}% · Platform {(platformFeeBps / 100).toFixed(2)}% · Proposer {(proposerFeeBps / 100).toFixed(2)}%
        </p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Current State (Read-only)</h3>
        <p><strong>CID:</strong> {cid}</p>
        <p>
          <strong>Current Proposer:</strong>{' '}
          {hasProposer
            ? <span title={currentProposer!}>{formatAddress(currentProposer!, proposerIdentity)}</span>
            : 'None'}
        </p>
        <p><em>These values are controlled by the relayer via flowSyncAuthority</em></p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Price Configuration</h3>
        <p><strong>Current Price:</strong> {formatEther(priceEthWei)} ETH</p>
        
        {isOwner ? (
          <div style={{ marginTop: '15px' }}>
            <p style={{ margin: '0 0 10px 0', color: salesPaused ? '#b45309' : '#15803d', fontWeight: 500 }}>
              Sales are currently {salesPaused ? 'paused. Set a new price to resume.' : 'active.'}
            </p>
            <label>
              New Price (ETH): 
              <input 
                type="number" 
                step="0.001"
                value={newPrice} 
                onChange={(e) => setNewPrice(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px', width: '150px' }}
                disabled={loading}
              />
            </label>
            <br />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={updatePrice}
                disabled={loading || !newPrice}
                style={{ 
                  padding: '10px 20px', 
                  fontSize: '14px', 
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Updating...' : salesPaused ? 'Resume Sales' : 'Update Price'}
              </button>
              {!salesPaused && (
                <button
                  onClick={pauseSales}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: loading ? '#ccc' : '#b91c1c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Updating...' : 'Pause Sales'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Connect as owner to modify price
          </p>
        )}
      </div>

      {!account && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
            Connect Wallet
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e8', color: '#2e7d32', borderRadius: '4px' }}>
          {success}
        </div>
      )}
    </div>
  );
}
