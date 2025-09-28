"use client";
import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { getInjectedProvider } from '../../lib/provider';
import { publicClient } from '../../lib/viemClient';
import { fetchDiscoverExperiences, DiscoverExperience } from '../../lib/publicExperiences';

const experienceAbi = [
  { "type": "function", "name": "balanceOf", "inputs": [{"type": "address"}, {"type": "uint256"}], "outputs": [{"type": "uint256"}], "stateMutability": "view" },
  { "type": "function", "name": "cid", "inputs": [], "outputs": [{"type": "string"}], "stateMutability": "view" },
  { "type": "function", "name": "priceEthWei", "inputs": [], "outputs": [{"type": "uint256"}], "stateMutability": "view" },
  { "type": "function", "name": "owner", "inputs": [], "outputs": [{"type": "address"}], "stateMutability": "view" },
] as const;

interface OwnedExperience {
  address: string;
  name: string;
  description: string;
  passBalance: bigint;
  cid: string;
  price: bigint;
  owner: string;
  active: boolean;
  location?: string;
  tags: string[];
}

export default function ExperienceDashboard() {
  const [account, setAccount] = useState<string>('');
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [ownedExperiences, setOwnedExperiences] = useState<OwnedExperience[]>([]);
  const [allExperiences, setAllExperiences] = useState<DiscoverExperience[]>([]);
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);

  useEffect(() => {
    checkWalletConnection();
    loadAllExperiences();
  }, []);

  useEffect(() => {
    if (account && allExperiences.length > 0) {
      loadOwnedExperiences();
    }
  }, [account, allExperiences]);

  async function checkWalletConnection() {
    try {
      const provider = await getInjectedProvider();
      if (provider) {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          
          // Check network
          const chainId = await provider.request({ method: 'eth_chainId' });
          setIsWrongNetwork(chainId !== '0xaa36a7');
        }
      }
    } catch (err) {
      console.error('Failed to check wallet connection:', err);
    }
  }

  async function connectWallet() {
    try {
      setLoading('Connecting...');
      setError('');
      
      const provider = await getInjectedProvider();
      if (!provider) {
        throw new Error('No wallet provider found. Please install MetaMask.');
      }
      
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        
        // Check network
        const chainId = await provider.request({ method: 'eth_chainId' });
        setIsWrongNetwork(chainId !== '0xaa36a7');
      }
    } catch (err: any) {
      setError('Failed to connect wallet: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading('');
    }
  }

  async function switchToSepolia() {
    try {
      const provider = await getInjectedProvider();
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
      });
      setIsWrongNetwork(false);
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
          setIsWrongNetwork(false);
        } catch (addError) {
          setError('Failed to add Sepolia network to wallet');
        }
      } else {
        setError('Failed to switch to Sepolia network');
      }
    }
  }

  async function loadAllExperiences() {
    try {
      setLoading('Loading all experiences...');
      console.log('🔍 Fetching all experiences from on-chain...');
      
      const experiences = await fetchDiscoverExperiences(50); // Get up to 50 experiences
      console.log(`✅ Found ${experiences.length} experiences on-chain`);
      
      setAllExperiences(experiences);
    } catch (err) {
      console.error('Failed to load all experiences:', err);
      setError('Failed to load experiences from blockchain');
    } finally {
      setLoading('');
    }
  }

  async function loadOwnedExperiences() {
    if (!account || allExperiences.length === 0) return;
    
    setLoading('Checking your pass balances...');
    const owned: OwnedExperience[] = [];
    
    try {
      for (const exp of allExperiences) {
        try {
          const passBalance = await publicClient.readContract({
            address: exp.address,
            abi: experienceAbi,
            functionName: 'balanceOf',
            args: [account as `0x${string}`, 1n],
          });

          owned.push({
            address: exp.address,
            name: exp.name,
            description: exp.summary || 'A token-gated experience',
            passBalance: passBalance as bigint,
            cid: exp.cid,
            price: BigInt(parseFloat(exp.priceEth) * 1e18), // Convert ETH to wei
            owner: exp.owner,
            active: exp.active,
            location: exp.location,
            tags: exp.tags,
          });
        } catch (err) {
          console.error(`Failed to load pass balance for ${exp.address}:`, err);
        }
      }
      
      console.log(`✅ Loaded ${owned.length} experiences with pass balances`);
      setOwnedExperiences(owned);
    } catch (err) {
      console.error('Failed to load pass balances:', err);
      setError('Failed to check pass balances');
    } finally {
      setLoading('');
    }
  }

  function disconnectWallet() {
    setAccount('');
    setOwnedExperiences([]);
    setError('');
    setIsWrongNetwork(false);
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: '600' }}>
            🎫 My Experiences
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a 
              href="/creator"
              style={{
                padding: '12px 20px',
                backgroundColor: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              🎨 Creator Dashboard
            </a>
            <a 
              href="/create"
              style={{
                padding: '12px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              🌍 Create New Experience
            </a>
          </div>
        </div>
        
        {/* Wallet Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {account ? (
            <>
              <div style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                🟢 {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              {isWrongNetwork && (
                <button 
                  onClick={switchToSepolia}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  📡 Switch to Sepolia
                </button>
              )}
              <button 
                onClick={disconnectWallet}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button 
              onClick={connectWallet}
              disabled={loading !== ''}
              style={{
                padding: '12px 24px',
                backgroundColor: loading !== '' ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: loading !== '' ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {loading || 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Status Messages */}
        {error && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '16px', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca',
            color: '#dc2626', 
            borderRadius: '8px',
            fontWeight: '500'
          }}>
            ❌ {error}
          </div>
        )}

        {isWrongNetwork && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '16px', 
            backgroundColor: '#fef3c7', 
            border: '1px solid #fcd34d',
            color: '#d97706', 
            borderRadius: '8px',
            fontWeight: '500'
          }}>
            ⚠️ Please switch to Sepolia network to view your experiences
          </div>
        )}

        {!account ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>👛</div>
            <h2 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Connect Your Wallet</h2>
            <p style={{ margin: '0', color: '#64748b' }}>
              Connect your MetaMask wallet to view your experience passes
            </p>
          </div>
        ) : loading === 'Loading experiences...' ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Loading Your Experiences...</h2>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>
                  {ownedExperiences.filter(exp => exp.passBalance > 0).length}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>Experiences Owned</div>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px' }}>
                  {ownedExperiences.reduce((sum, exp) => sum + Number(exp.passBalance), 0)}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Passes</div>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '600', color: '#f59e0b', marginBottom: '8px' }}>
                  {allExperiences.length}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>Available Experiences</div>
              </div>
            </div>

            {/* Experiences Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
              gap: '20px'
            }}>
              {ownedExperiences.map((exp) => (
                <div key={exp.address} style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  border: exp.passBalance > 0 ? '2px solid #10b981' : '1px solid #e5e7eb'
                }}>
                  {/* Card Header */}
                  <div style={{
                    padding: '20px 20px 0 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '18px' }}>
                        {exp.name}
                      </h3>
                      <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px' }}>
                        {exp.description}
                      </p>
                      {(exp.location || exp.tags.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                          {exp.location && (
                            <span style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              📍 {exp.location}
                            </span>
                          )}
                          {exp.tags.slice(0, 2).map((tag) => (
                            <span
                              key={`${exp.address}-${tag}`}
                              style={{
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {exp.passBalance > 0 && (
                      <div style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✅ OWNED
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        Contract Address:
                      </div>
                      <div style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '11px', 
                        color: '#374151',
                        wordBreak: 'break-all'
                      }}>
                        {exp.address}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          Your Passes:
                        </div>
                        <div style={{ 
                          fontSize: '20px', 
                          fontWeight: '600', 
                          color: exp.passBalance > 0 ? '#10b981' : '#6b7280' 
                        }}>
                          {exp.passBalance.toString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          Price per Pass:
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#1e293b' 
                        }}>
                          {(Number(exp.price) / 1e18).toFixed(3)} ETH
                        </div>
                      </div>
                    </div>

                    {exp.passBalance > 0 && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '4px' }}>
                          Content ID:
                        </div>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '11px', 
                          color: '#166534',
                          wordBreak: 'break-all'
                        }}>
                          {exp.cid}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a 
                        href={`/experience/${exp.address}/buy`}
                        style={{
                          flex: 1,
                          padding: '12px',
                          backgroundColor: exp.passBalance > 0 ? '#f3f4f6' : '#3b82f6',
                          color: exp.passBalance > 0 ? '#374151' : 'white',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'block'
                        }}
                      >
                        {exp.passBalance > 0 ? '🎯 Access Experience' : '🛒 Buy Pass'}
                      </a>
                      {exp.passBalance > 0 && (
                        <a 
                          href={`/experience/${exp.address}/proposals`}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          🗳️
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {ownedExperiences.length === 0 && allExperiences.length > 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎯</div>
                <h2 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>No Passes Owned Yet</h2>
                <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>
                  You haven't purchased any experience passes yet. Browse the experiences above to get started!
                </p>
                {allExperiences.length > 0 && (
                  <a 
                    href={`/experience/${allExperiences[0].address}/buy`}
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}
                  >
                    🛒 Buy Your First Pass
                  </a>
                )}
              </div>
            )}
            
            {allExperiences.length === 0 && !loading && (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌱</div>
                <h2 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>No Experiences Available</h2>
                <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>
                  No experience contracts have been deployed yet. Be the first to create one!
                </p>
                <a 
                  href="/create"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '600'
                  }}
                >
                  🎨 Create First Experience
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
