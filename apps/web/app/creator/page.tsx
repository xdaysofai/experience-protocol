"use client";
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import ExperienceAbi from '../../abi/Experience.json';
import { lighthouseService, isLighthouseAvailable, promptForApiKey, ExperienceIndex } from '../../lib/lighthouse';
import { experienceRegistryService, ExperienceInfo } from '../../lib/experienceRegistry';
import { useWallet } from '../../contexts/WalletContext';
import WalletButton from '../../components/WalletButton';

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
  const { account, wallet, isConnected, isWrongNetwork } = useWallet();
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [createdExperiences, setCreatedExperiences] = useState<ExperienceInfo[]>([]);
  const [purchasedExperiences, setPurchasedExperiences] = useState<ExperienceInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'created' | 'purchased'>('created');
  
  // Edit states
  const [editingExperience, setEditingExperience] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCid, setEditCid] = useState<string>('');
  const [editProposer, setEditProposer] = useState<string>('');
  
  // Manual experience addition
  const [showAddExperience, setShowAddExperience] = useState<boolean>(false);
  const [manualAddress, setManualAddress] = useState<string>('');
  
  // Lighthouse integration
  const [lighthouseHash, setLighthouseHash] = useState<string>('');
  const [showLighthouseSetup, setShowLighthouseSetup] = useState<boolean>(false);
  const [lighthouseEnabled, setLighthouseEnabled] = useState<boolean>(false);

  function clearExperiences() {
    setCreatedExperiences([]);
    setPurchasedExperiences([]);
  }

  async function loadExperiences() {
    if (!account) return;
    
    try {
      setLoading('Loading experiences...');
      
      // 1. Try loading from Lighthouse first (fastest)
      let lighthouseExperiences: ExperienceIndex[] = [];
      if (lighthouseEnabled && lighthouseHash) {
        lighthouseExperiences = await loadFromLighthouse();
      }

      // 2. Convert Lighthouse data to ExperienceInfo format
      const created: ExperienceInfo[] = [];
      for (const lhExp of lighthouseExperiences) {
        try {
          const info = await getExperienceInfo(lhExp.address, account);
          created.push(info);
        } catch (err) {
          console.error('Failed to load Lighthouse experience:', lhExp.address, err);
        }
      }

      // 3. If no Lighthouse data, fall back to blockchain queries
      if (created.length === 0) {
        console.log('No Lighthouse data, querying blockchain...');
        
        const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
        if (factoryAddress) {
          try {
            const blockchainCreated = await loadCreatedExperiencesChunked(factoryAddress, account);
            created.push(...blockchainCreated);
            console.log(`Found ${blockchainCreated.length} created experiences from factory events`);
            
            // Sync new findings to Lighthouse
            if (lighthouseEnabled && blockchainCreated.length > 0) {
              setTimeout(() => syncExperiencesToLighthouse(), 1000);
            }
          } catch (err: any) {
            console.error('Factory log query failed:', err);
            console.log('Falling back to known experiences only');
          }
        }
        
        // 4. Also check known experiences as final fallback
        await loadKnownExperiences();
      }

      setCreatedExperiences(created);
      
      // Always load known experiences to check for purchases
      await loadKnownExperiences();
      
    } catch (err: any) {
      console.error('Failed to load experiences:', err);
      setError('Failed to load experiences: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  async function loadCreatedExperiencesChunked(factoryAddress: `0x${string}`, userAccount: string): Promise<ExperienceInfo[]> {
    const created: ExperienceInfo[] = [];
    
    try {
      // Get latest block number
      const latestBlock = await publicClient.getBlockNumber();
      const chunkSize = 10000n; // Smaller chunks to avoid RPC limits
      
      // Start from a recent block to catch newer deployments (last ~30 days)
      const startBlock = latestBlock > 50000n ? latestBlock - 50000n : 0n;
      
      for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += chunkSize) {
        const toBlock = fromBlock + chunkSize - 1n > latestBlock ? latestBlock : fromBlock + chunkSize - 1n;
        
        try {
          const creationLogs = await publicClient.getLogs({
            address: factoryAddress,
            event: factoryAbi[0],
            args: {
              creator: userAccount as `0x${string}`
            },
            fromBlock: fromBlock,
            toBlock: toBlock,
          });

          for (const log of creationLogs) {
            if (log.args.experience) {
              try {
                const info = await getExperienceInfo(log.args.experience, userAccount);
                created.push(info);
              } catch (err) {
                console.error('Failed to load created experience:', log.args.experience, err);
              }
            }
          }
        } catch (chunkErr: any) {
          console.error(`Failed to load chunk ${fromBlock}-${toBlock}:`, chunkErr);
          // Continue with next chunk
        }
      }
    } catch (err: any) {
      console.error('Chunked loading failed:', err);
      throw err;
    }
    
    return created;
  }

  async function loadKnownExperiences() {
    // Known experiences that users might have purchased or created
    const knownExperiences = [
      '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A',
      '0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F',
      // Add more known experience addresses here as they are deployed
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
    if (!account || !wallet) return;
    
    try {
      setLoading('Updating price...');

      const priceWei = BigInt(Math.floor(parseFloat(newPriceEth) * 1e18));
      
      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setPriceEthWei',
        args: [priceWei],
        account: account as `0x${string}`,
      });

      const hash = await wallet.writeContract(request);
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
    if (!account || !wallet) return;
    
    try {
      setLoading('Updating content...');

      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setCid',
        args: [newCid],
        account: account as `0x${string}`,
      });

      const hash = await wallet.writeContract(request);
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
    if (!account || !wallet) return;
    
    try {
      setLoading('Updating proposer...');

      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setCurrentProposer',
        args: [newProposer as `0x${string}`],
        account: account as `0x${string}`,
      });

      const hash = await wallet.writeContract(request);
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

  async function addManualExperience() {
    if (!manualAddress || !account) return;
    
    try {
      setLoading('Adding experience...');
      
      // Validate address format
      if (!manualAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        setError('Invalid contract address format');
        return;
      }
      
      // Check if already in the list
      if (createdExperiences.find(exp => exp.address.toLowerCase() === manualAddress.toLowerCase())) {
        setError('Experience already in your list');
        return;
      }
      
      const info = await getExperienceInfo(manualAddress, account);
      
      if (info.isCreator) {
        setCreatedExperiences(prev => [...prev, info]);
        // Sync to Lighthouse
        await addExperienceToLighthouse(info);
      } else if (info.isOwned) {
        setPurchasedExperiences(prev => [...prev, info]);
      } else {
        setError('You are not the creator or owner of this experience');
        return;
      }
      
      setManualAddress('');
      setShowAddExperience(false);
      
    } catch (err: any) {
      setError('Failed to add experience: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  useEffect(() => {
    if (isConnected && !isWrongNetwork) {
      checkLighthouseSetup();
      loadExperiences();
    } else if (!isConnected) {
      clearExperiences();
    }
  }, [isConnected, isWrongNetwork, account]);

  async function checkLighthouseSetup() {
    if (!account) return;
    
    const enabled = isLighthouseAvailable();
    setLighthouseEnabled(enabled);
    
    if (enabled) {
      // Load existing hash from localStorage
      const hash = lighthouseService.loadHashFromLocalStorage(account);
      if (hash) {
        setLighthouseHash(hash);
        console.log('Found existing Lighthouse hash:', hash);
      }
    }
  }

  async function setupLighthouse() {
    const apiKey = promptForApiKey();
    if (apiKey) {
      setLighthouseEnabled(true);
      setShowLighthouseSetup(false);
      
      // Try to sync current experiences to Lighthouse
      if (createdExperiences.length > 0) {
        await syncExperiencesToLighthouse();
      }
    }
  }

  async function loadFromLighthouse(): Promise<ExperienceIndex[]> {
    if (!lighthouseEnabled || !lighthouseHash || !account) {
      return [];
    }

    try {
      setLoading('Loading from Lighthouse...');
      const data = await lighthouseService.loadCreatorExperienceList(lighthouseHash);
      
      console.log(`Loaded ${data.experiences.length} experiences from Lighthouse`);
      return data.experiences || [];
    } catch (error: any) {
      console.error('Failed to load from Lighthouse:', error);
      // Don't show error to user for Lighthouse failures
      return [];
    }
  }

  async function syncExperiencesToLighthouse() {
    if (!lighthouseEnabled || !account) return;

    try {
      const experienceIndexes: ExperienceIndex[] = createdExperiences.map(exp => ({
        address: exp.address,
        creator: exp.owner,
        cid: exp.cid,
        createdAt: Date.now(), // We don't have the actual creation time, use current
        metadata: {
          priceEth: formatEther(exp.priceEthWei)
        }
      }));

      const hash = await lighthouseService.saveCreatorExperienceList(account, experienceIndexes);
      setLighthouseHash(hash);
      lighthouseService.saveHashToLocalStorage(account, hash);
      
      console.log('Synced experiences to Lighthouse:', hash);
    } catch (error: any) {
      console.error('Failed to sync to Lighthouse:', error);
      setError('Failed to sync to Lighthouse: ' + error.message);
    }
  }

  async function addExperienceToLighthouse(experienceInfo: ExperienceInfo) {
    if (!lighthouseEnabled || !account) return;

    try {
      const experienceIndex: ExperienceIndex = {
        address: experienceInfo.address,
        creator: experienceInfo.owner,
        cid: experienceInfo.cid,
        createdAt: Date.now(),
        metadata: {
          priceEth: formatEther(experienceInfo.priceEthWei)
        }
      };

      const hash = await lighthouseService.addExperienceToList(
        account, 
        experienceIndex, 
        lighthouseHash || undefined
      );
      
      setLighthouseHash(hash);
      lighthouseService.saveHashToLocalStorage(account, hash);
      
      console.log('Added experience to Lighthouse:', hash);
    } catch (error: any) {
      console.error('Failed to add to Lighthouse:', error);
      // Don't break the flow for Lighthouse errors
    }
  }

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
        <WalletButton size="md" />
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {!isConnected ? (
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
            <WalletButton size="lg" />
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
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h2 style={{ margin: 0, color: '#1e293b' }}>
                        Your Created Experiences
                      </h2>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!lighthouseEnabled && (
                          <button
                            onClick={() => setShowLighthouseSetup(true)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            ☁️ Enable Sync
                          </button>
                        )}
                        <button
                          onClick={() => setShowAddExperience(true)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          + Add Experience
                        </button>
                      </div>
                    </div>
                    
                    {/* Lighthouse Status */}
                    {lighthouseEnabled && (
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>☁️ Lighthouse sync enabled</span>
                        {lighthouseHash && (
                          <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                            ({lighthouseHash.slice(0, 8)}...)
                          </span>
                        )}
                        <button
                          onClick={syncExperiencesToLighthouse}
                          disabled={loading !== ''}
                          style={{
                            marginLeft: 'auto',
                            padding: '2px 6px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          Sync Now
                        </button>
                      </div>
                    )}
                  </div>
                  
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

        {/* Lighthouse Setup Modal */}
        {showLighthouseSetup && (
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
              width: '100%'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>
                ☁️ Enable Lighthouse Sync
              </h3>
              <p style={{ margin: '0 0 20px 0', color: '#6b7280', lineHeight: '1.5' }}>
                Lighthouse allows you to sync your experience list across devices using decentralized storage. 
                Your data is stored on IPFS and accessible from any device.
              </p>
              
              <div style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#15803d', fontSize: '14px' }}>Benefits:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#166534', fontSize: '14px' }}>
                  <li>Access your experiences from any device</li>
                  <li>Reduce blockchain queries (faster loading)</li>
                  <li>Decentralized backup of your experience list</li>
                  <li>Share experience lists with others</li>
                </ul>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#92400e'
              }}>
                <strong>Get your free API key:</strong><br />
                1. Visit <a href="https://www.lighthouse.storage/" target="_blank" rel="noopener noreferrer" style={{ color: '#92400e', textDecoration: 'underline' }}>lighthouse.storage</a><br />
                2. Sign up for a free account<br />
                3. Copy your API key and paste below
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={setupLighthouse}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Setup Lighthouse
                </button>
                
                <button
                  onClick={() => setShowLighthouseSetup(false)}
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
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Experience Modal */}
        {showAddExperience && (
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
              width: '100%'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>
                Add Experience Contract
              </h3>
              <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
                Enter the contract address of an experience you created or own passes for.
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Contract Address
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={addManualExperience}
                  disabled={!manualAddress || loading !== ''}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: !manualAddress || loading !== '' ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: !manualAddress || loading !== '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading || 'Add Experience'}
                </button>
                
                <button
                  onClick={() => {
                    setShowAddExperience(false);
                    setManualAddress('');
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
