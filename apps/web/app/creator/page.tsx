"use client";
import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { getInjectedProvider } from '../../lib/provider';
import ExperienceAbi from '../../abi/Experience.json';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC || 'https://ethereum-sepolia-rpc.publicnode.com'),
});

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

interface ExperienceInfo {
  address: string;
  owner: string;
  cid: string;
  priceEthWei: bigint;
  currentProposer: string;
  isOwned: boolean;
  passBalance: bigint;
  isCreator: boolean;
}

export default function CreatorDashboard() {
  const [account, setAccount] = useState<string>('');
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  
  const [createdExperiences, setCreatedExperiences] = useState<ExperienceInfo[]>([]);
  const [purchasedExperiences, setPurchasedExperiences] = useState<ExperienceInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'created' | 'purchased'>('created');
  
  // Edit states
  const [editingExperience, setEditingExperience] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCid, setEditCid] = useState<string>('');
  const [editProposer, setEditProposer] = useState<string>('');

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
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Chain not added to wallet, add it
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
          setIsWrongNetwork(false);
        } catch (addError) {
          setError('Failed to add Sepolia network');
        }
      } else {
        setError('Failed to switch to Sepolia network');
      }
    }
  }

  function disconnectWallet() {
    setAccount('');
    setIsWrongNetwork(false);
    setCreatedExperiences([]);
    setPurchasedExperiences([]);
  }

  async function loadExperiences() {
    if (!account) return;
    
    try {
      setLoading('Loading experiences...');
      
      const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
      if (!factoryAddress) {
        console.log('No factory address configured, using known experiences');
        await loadKnownExperiences();
        return;
      }

      // Get creation events for this user
      const creationLogs = await publicClient.getLogs({
        address: factoryAddress,
        event: factoryAbi[0],
        args: {
          creator: account as `0x${string}`
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const created: ExperienceInfo[] = [];
      for (const log of creationLogs) {
        if (log.args.experience) {
          try {
            const info = await getExperienceInfo(log.args.experience, account);
            created.push(info);
          } catch (err) {
            console.error('Failed to load created experience:', log.args.experience, err);
          }
        }
      }

      setCreatedExperiences(created);
      
      // Also load known experiences to check for purchases
      await loadKnownExperiences();
      
    } catch (err: any) {
      console.error('Failed to load experiences:', err);
      setError('Failed to load experiences: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  async function loadKnownExperiences() {
    // Known experiences that users might have purchased
    const knownExperiences = [
      '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A',
      '0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F',
      // Add more known experience addresses here
    ];

    const purchased: ExperienceInfo[] = [];
    
    for (const address of knownExperiences) {
      try {
        const info = await getExperienceInfo(address, account);
        
        // Only add to purchased if user owns passes but didn't create it
        if (info.passBalance > 0 && !info.isCreator) {
          purchased.push(info);
        }
        
        // Add to created if user is the creator and not already in created list
        if (info.isCreator && !createdExperiences.find(exp => exp.address === address)) {
          setCreatedExperiences(prev => [...prev, info]);
        }
      } catch (err) {
        console.error('Failed to load known experience:', address, err);
      }
    }
    
    setPurchasedExperiences(purchased);
  }

  async function getExperienceInfo(address: string, userAccount: string): Promise<ExperienceInfo> {
    const contract = {
      address: address as `0x${string}`,
      abi: ExperienceAbi.abi,
    };

    const [owner, cid, priceEthWei, currentProposer, passBalance] = await Promise.all([
      publicClient.readContract({ ...contract, functionName: 'owner' }),
      publicClient.readContract({ ...contract, functionName: 'cid' }),
      publicClient.readContract({ ...contract, functionName: 'priceEthWei' }),
      publicClient.readContract({ ...contract, functionName: 'currentProposer' }),
      publicClient.readContract({ 
        ...contract, 
        functionName: 'balanceOf', 
        args: [userAccount as `0x${string}`, 1n] 
      })
    ]);

    return {
      address,
      owner: owner as string,
      cid: cid as string,
      priceEthWei: priceEthWei as bigint,
      currentProposer: currentProposer as string,
      isOwned: (passBalance as bigint) > 0,
      passBalance: passBalance as bigint,
      isCreator: (owner as string).toLowerCase() === userAccount.toLowerCase()
    };
  }

  async function updatePrice(experienceAddress: string, newPriceEth: string) {
    if (!account) return;
    
    try {
      setLoading('Updating price...');
      
      const provider = await getInjectedProvider();
      const walletClient = createWalletClient({ 
        chain: sepolia, 
        transport: custom(provider) 
      });

      const priceWei = BigInt(Math.floor(parseFloat(newPriceEth) * 1e18));
      
      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setPriceEthWei',
        args: [priceWei],
        account: account as `0x${string}`,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh the experience data
      await loadExperiences();
      setEditingExperience('');
      setEditPrice('');
      
    } catch (err: any) {
      setError('Failed to update price: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  async function updateCid(experienceAddress: string, newCid: string) {
    if (!account) return;
    
    try {
      setLoading('Updating content...');
      
      const provider = await getInjectedProvider();
      const walletClient = createWalletClient({ 
        chain: sepolia, 
        transport: custom(provider) 
      });

      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setCid',
        args: [newCid],
        account: account as `0x${string}`,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh the experience data
      await loadExperiences();
      setEditingExperience('');
      setEditCid('');
      
    } catch (err: any) {
      setError('Failed to update content: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  async function updateProposer(experienceAddress: string, newProposer: string) {
    if (!account) return;
    
    try {
      setLoading('Updating proposer...');
      
      const provider = await getInjectedProvider();
      const walletClient = createWalletClient({ 
        chain: sepolia, 
        transport: custom(provider) 
      });

      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setCurrentProposer',
        args: [newProposer as `0x${string}`],
        account: account as `0x${string}`,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh the experience data
      await loadExperiences();
      setEditingExperience('');
      setEditProposer('');
      
    } catch (err: any) {
      setError('Failed to update proposer: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  useEffect(() => {
    if (account && !isWrongNetwork) {
      loadExperiences();
    }
  }, [account, isWrongNetwork]);

  const renderExperienceCard = (exp: ExperienceInfo, showEditOptions: boolean = false) => (
    <div key={exp.address} style={{
      padding: '24px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      backgroundColor: 'white',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
            {exp.cid.startsWith('ipfs://') ? exp.cid.replace('ipfs://', '') : exp.cid}
          </h3>
          <div style={{ display: 'grid', gap: '4px', fontSize: '14px', color: '#6b7280' }}>
            <div><strong>Address:</strong> {exp.address}</div>
            <div><strong>Price:</strong> {formatEther(exp.priceEthWei)} ETH</div>
            {exp.currentProposer !== '0x0000000000000000000000000000000000000000' && (
              <div><strong>Proposer:</strong> {exp.currentProposer}</div>
            )}
            {exp.isOwned && (
              <div style={{ color: '#10b981', fontWeight: '500' }}>
                <strong>Your Passes:</strong> {exp.passBalance.toString()}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {exp.isCreator && (
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              Creator
            </span>
          )}
          {exp.isOwned && (
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              Owned
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={`/experience/${exp.address}/buy`}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6366f1',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🎫 View Experience
        </a>
        
        {exp.isCreator && (
          <>
            <a
              href={`/experience/${exp.address}/settings`}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ⚙️ Settings
            </a>
            
            {showEditOptions && (
              <button
                onClick={() => {
                  setEditingExperience(exp.address);
                  setEditPrice(formatEther(exp.priceEthWei));
                  setEditCid(exp.cid);
                  setEditProposer(exp.currentProposer);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ✏️ Quick Edit
              </button>
            )}
          </>
        )}
        
        <a
          href={`https://sepolia.etherscan.io/address/${exp.address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔗 Etherscan
        </a>
      </div>
    </div>
  );

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
            🎨 Creator Dashboard
          </h1>
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
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  📡 Switch to Sepolia
                </button>
              )}
              <button 
                onClick={disconnectWallet}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
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
        {!account ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👛</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Connect Your Wallet</h2>
            <p style={{ margin: '0', color: '#6b7280' }}>
              Connect your wallet to view and manage your experiences
            </p>
          </div>
        ) : isWrongNetwork ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔗</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Wrong Network</h2>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>
              Please switch to Sepolia testnet to continue
            </p>
            <button 
              onClick={switchToSepolia}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📡 Switch to Sepolia
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '20px',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setActiveTab('created')}
                  style={{
                    flex: 1,
                    padding: '16px 24px',
                    backgroundColor: activeTab === 'created' ? '#6366f1' : 'transparent',
                    color: activeTab === 'created' ? 'white' : '#6b7280',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🎨 Created Experiences ({createdExperiences.length})
                </button>
                <button
                  onClick={() => setActiveTab('purchased')}
                  style={{
                    flex: 1,
                    padding: '16px 24px',
                    backgroundColor: activeTab === 'purchased' ? '#6366f1' : 'transparent',
                    color: activeTab === 'purchased' ? 'white' : '#6b7280',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🎫 Purchased Experiences ({purchasedExperiences.length})
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: '24px'
            }}>
              {activeTab === 'created' ? (
                <div>
                  <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>
                    Your Created Experiences
                  </h2>
                  
                  {createdExperiences.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Experiences Created Yet</h3>
                      <p style={{ margin: '0 0 20px 0' }}>
                        Start creating amazing travel experiences for your community
                      </p>
                      <a 
                        href="/create"
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}
                      >
                        🌍 Create Your First Experience
                      </a>
                    </div>
                  ) : (
                    createdExperiences.map(exp => renderExperienceCard(exp, true))
                  )}
                </div>
              ) : (
                <div>
                  <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>
                    Experiences You Own
                  </h2>
                  
                  {purchasedExperiences.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Passes Owned</h3>
                      <p style={{ margin: '0 0 20px 0' }}>
                        Purchase passes to access exclusive travel experiences
                      </p>
                      <a 
                        href="/experience"
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}
                      >
                        🎫 Browse Experiences
                      </a>
                    </div>
                  ) : (
                    purchasedExperiences.map(exp => renderExperienceCard(exp, false))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Quick Edit Modal */}
        {editingExperience && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>
                Quick Edit Experience
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Content ID (CID)
                </label>
                <input
                  type="text"
                  value={editCid}
                  onChange={(e) => setEditCid(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Proposer Address (optional)
                </label>
                <input
                  type="text"
                  value={editProposer}
                  onChange={(e) => setEditProposer(e.target.value)}
                  placeholder="0x0000000000000000000000000000000000000000"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => updatePrice(editingExperience, editPrice)}
                  disabled={loading !== ''}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: loading !== '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  Update Price
                </button>
                
                <button
                  onClick={() => updateCid(editingExperience, editCid)}
                  disabled={loading !== ''}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: loading !== '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  Update Content
                </button>
                
                <button
                  onClick={() => updateProposer(editingExperience, editProposer)}
                  disabled={loading !== ''}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: loading !== '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  Update Proposer
                </button>
                
                <button
                  onClick={() => {
                    setEditingExperience('');
                    setEditPrice('');
                    setEditCid('');
                    setEditProposer('');
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '8px',
            fontWeight: '500',
            zIndex: 1001,
            maxWidth: '400px'
          }}>
            ❌ {error}
            <button
              onClick={() => setError('')}
              style={{
                marginLeft: '12px',
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            borderRadius: '8px',
            fontWeight: '500',
            zIndex: 1001
          }}>
            ⏳ {loading}
          </div>
        )}
      </div>
    </div>
  );
}
