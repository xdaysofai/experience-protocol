"use client";
import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import ExperienceAbi from '../../../../abi/Experience.json';
import { getInjectedProvider } from '../../../../lib/provider';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC || 'https://rpc.sepolia.org'),
});

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

  const isOwner = account && owner && account.toLowerCase() === owner.toLowerCase();

  useEffect(() => {
    loadContractData();
    connectWallet();
  }, [experience]);

  async function loadContractData() {
    try {
      const [ownerData, price, cidData, proposer] = await Promise.all([
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
      ]);

      setOwner(ownerData as string);
      setPriceEthWei(price as bigint);
      setCid(cidData as string);
      setCurrentProposer(proposer as string);
      setNewPrice(formatEther(price as bigint));
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

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Experience Settings</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Contract Info</h3>
        <p><strong>Experience:</strong> {experience}</p>
        <p><strong>Owner:</strong> {owner}</p>
        <p><strong>Connected Account:</strong> {account || 'Not connected'}</p>
        <p><strong>Access Level:</strong> {isOwner ? '✅ Owner' : '❌ Read-only'}</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Current State (Read-only)</h3>
        <p><strong>CID:</strong> {cid}</p>
        <p><strong>Current Proposer:</strong> {currentProposer || 'None'}</p>
        <p><em>These values are controlled by the relayer via flowSyncAuthority</em></p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Price Configuration</h3>
        <p><strong>Current Price:</strong> {formatEther(priceEthWei)} ETH</p>
        
        {isOwner ? (
          <div style={{ marginTop: '15px' }}>
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
            <button 
              onClick={updatePrice}
              disabled={loading || !newPrice}
              style={{ 
                marginTop: '10px',
                padding: '10px 20px', 
                fontSize: '14px', 
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Updating...' : 'Update Price'}
            </button>
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