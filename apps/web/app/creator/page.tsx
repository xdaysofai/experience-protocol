"use client";
import { useState, useEffect } from 'react';
import { formatEther, parseEther } from 'viem';
import ExperienceAbi from '../../abi/Experience.json';
import { lighthouseService, isLighthouseAvailable, promptForApiKey, ExperienceIndex, PurchaseIndex } from '../../lib/lighthouse';
import { experienceRegistryService, ExperienceInfo } from '../../lib/experienceRegistry';
import { useWallet } from '../../contexts/WalletContext';
import WalletButton from '../../components/WalletButton';
import { publicClient } from '../../lib/viemClient';

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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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
  const [purchaseHash, setPurchaseHash] = useState<string>('');
  const [showLighthouseSetup, setShowLighthouseSetup] = useState<boolean>(false);
  const [lighthouseEnabled, setLighthouseEnabled] = useState<boolean>(false);

  // Enhanced loading states for better UX
  const [lighthouseLoading, setLighthouseLoading] = useState<boolean>(false);
  const [blockchainLoading, setBlockchainLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'lighthouse' | 'blockchain' | 'hybrid' | 'known'>('known');

  function clearExperiences() {
    setCreatedExperiences([]);
    setPurchasedExperiences([]);
  }

  // ENHANCED SMART FALLBACK STRATEGY
  async function loadExperiences() {
    if (!account) return;
    
    try {
      setLoading('Loading experiences...');
      
      // PHASE 1: INSTANT UX - Load from Lighthouse first (if available)
      let lighthouseExperiences: ExperienceIndex[] = [];
      let lighthouseLoaded = false;
      
      if (lighthouseEnabled && lighthouseHash) {
        try {
          setLighthouseLoading(true);
          setLoading('📦 Loading from Lighthouse (instant)...');
          
          lighthouseExperiences = await loadFromLighthouse();
          lighthouseLoaded = true;
          setDataSource('lighthouse');
          console.log(`📦 INSTANT: Loaded ${lighthouseExperiences.length} experiences from Lighthouse`);
          
          // IMMEDIATELY show Lighthouse data for instant UX
          const instantCreated: ExperienceInfo[] = [];
          const instantPurchased: ExperienceInfo[] = [];
          
          for (const lhExp of lighthouseExperiences) {
            try {
              const info = await getExperienceInfo(lhExp.address, account);
              if (info.isCreator) {
                instantCreated.push(info);
              } else if (info.passBalance > 0n) {
                instantPurchased.push(info);
              }
            } catch (err) {
              // Fallback to basic info from Lighthouse
              const fallback = experienceFromIndex(lhExp, account);
              if (fallback.isCreator) {
                instantCreated.push(fallback);
              } else if (fallback.passBalance > 0n) {
                instantPurchased.push(fallback);
              }
            }
          }
          
          setCreatedExperiences(instantCreated);
          setPurchasedExperiences(instantPurchased);
          setLighthouseLoading(false);
          
          // Show user that data is loaded and we're syncing
          setLoading('✅ Data loaded! Syncing with blockchain...');
          
        } catch (err) {
          console.warn('Lighthouse load failed, falling back to blockchain:', err);
          setLighthouseLoading(false);
        }
      }

      // PHASE 2: BACKGROUND SYNC - Load recent blockchain data (with timeout)
      const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
      let recentExperiences: ExperienceInfo[] = [];
      
      if (factoryAddress) {
        try {
          setBlockchainLoading(true);
          
          // Set a timeout for blockchain queries to prevent hanging
          const blockchainPromise = loadCreatedExperiencesChunked(factoryAddress, account);
          const timeoutPromise = new Promise<ExperienceInfo[]>((_, reject) => 
            setTimeout(() => reject(new Error('Blockchain query timeout')), 10000)
          );
          
          recentExperiences = await Promise.race([blockchainPromise, timeoutPromise]);
          setBlockchainLoading(false);
          console.log(`🔗 BACKGROUND: Found ${recentExperiences.length} recent experiences from blockchain`);
          
        } catch (err: any) {
          setBlockchainLoading(false);
          console.warn('Blockchain sync failed (using Lighthouse data):', err.message);
          // Continue with Lighthouse data if blockchain fails
        }
      }

      // PHASE 3: MERGE - Combine Lighthouse + recent blockchain data
      if (recentExperiences.length > 0 || !lighthouseLoaded) {
        const allExperiences = new Map<string, ExperienceInfo>();
        
        // Add Lighthouse data first (if we have it)
        if (lighthouseLoaded) {
          for (const lhExp of lighthouseExperiences) {
            try {
              const info = await getExperienceInfo(lhExp.address, account);
              allExperiences.set(lhExp.address.toLowerCase(), info);
            } catch (err) {
              const fallback = experienceFromIndex(lhExp, account);
              allExperiences.set(lhExp.address.toLowerCase(), fallback);
            }
          }
        }
        
        // Add/update with recent blockchain data
        for (const recentExp of recentExperiences) {
          allExperiences.set(recentExp.address.toLowerCase(), recentExp);
        }

        // If still no data, check known experiences
        if (allExperiences.size === 0) {
          setLoading('Loading known experiences...');
          setDataSource('known');
          const knownCreated = await loadKnownExperiences();
          const knownPurchased = await loadPurchasedExperiences();
          
          for (const exp of knownCreated) {
            allExperiences.set(exp.address.toLowerCase(), exp);
          }
          for (const exp of knownPurchased) {
            allExperiences.set(exp.address.toLowerCase(), exp);
          }
        } else {
          setDataSource(lighthouseLoaded && recentExperiences.length > 0 ? 'hybrid' : lighthouseLoaded ? 'lighthouse' : 'blockchain');
        }

        // Convert to arrays and separate created vs purchased
        const allExpArray = Array.from(allExperiences.values());
        const created = allExpArray.filter(exp => exp.isCreator);
        const purchased = allExpArray.filter(exp => exp.passBalance > 0n && !exp.isCreator);

        setCreatedExperiences(created);
        setPurchasedExperiences(purchased);

        // PHASE 4: AUTO-SYNC - Save new blockchain findings to Lighthouse
        if (lighthouseEnabled && recentExperiences.length > 0) {
          try {
            await syncExperiencesToLighthouse(created);
            console.log('✅ Synced new experiences to Lighthouse');
          } catch (err) {
            console.warn('Failed to sync to Lighthouse:', err);
          }
        }
      }

    } catch (err: any) {
      console.error('Failed to load experiences:', err);
      setError('Failed to load experiences: ' + err.message);
    } finally {
      setLoading('');
      setLighthouseLoading(false);
      setBlockchainLoading(false);
    }
  }

  async function loadCreatedExperiencesChunked(factoryAddress: `0x${string}`, userAccount: string): Promise<ExperienceInfo[]> {
    const created: ExperienceInfo[] = [];
    
    try {
      console.log(`🔍 Searching for experiences created by ${userAccount} from factory ${factoryAddress}`);
      
      // Get latest block number
      const latestBlock = await publicClient.getBlockNumber();
      const chunkSize = 10000n; // Smaller chunks to avoid RPC limits
      
      // Only search last 30 days to avoid timeout (about 30k blocks on Sepolia)
      const blocksIn30Days = 30000n; // Approximate blocks in 30 days
      const startBlock = latestBlock > blocksIn30Days ? latestBlock - blocksIn30Days : 0n;
      
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

  async function loadKnownExperiences(): Promise<ExperienceInfo[]> {
    // Known experiences that users might have purchased or created
    const knownAddresses = [
      '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A',
      '0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F',
      // Add more known experience addresses here as they are deployed
    ];

    const created: ExperienceInfo[] = [];

    for (const address of knownAddresses) {
      try {
        const info = await getExperienceInfo(address, account);

        // Only add to created if user is the creator
        if (info.isCreator) {
          created.push(info);
        }
      } catch (err) {
        console.error('Failed to load known experience:', address, err);
      }
    }

    return created;
  }

  async function loadPurchasedExperiences() {
    // Load purchased experiences from known addresses
    const knownAddresses = [
      '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A',
      '0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F',
    ];

    const purchased: ExperienceInfo[] = [];

    for (const address of knownAddresses) {
      try {
        const info = await getExperienceInfo(address, account);

        // Only add to purchased if user owns passes but didn't create it
        if (info.passBalance > 0 && !info.isCreator) {
          purchased.push(info);
        }
      } catch (err) {
        console.error('Failed to load known experience:', address, err);
      }
    }

    setPurchasedExperiences(purchased);
  }

  async function getExperienceInfo(address: string, userAccount: string): Promise<ExperienceInfo> {
    try {
      const [owner, cid, priceEthWei, currentProposer, passBalance] = await Promise.all([
        publicClient.readContract({
          address: address as `0x${string}`,
          abi: ExperienceAbi.abi,
          functionName: 'owner',
        }),
        publicClient.readContract({
          address: address as `0x${string}`,
          abi: ExperienceAbi.abi,
          functionName: 'cid',
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
        }),
        publicClient.readContract({
          address: address as `0x${string}`,
          abi: ExperienceAbi.abi,
          functionName: 'balanceOf',
          args: [userAccount as `0x${string}`, 1n],
        }),
      ]);

      return {
        address,
        owner: owner as string,
        cid: cid as string,
        priceEthWei: priceEthWei as bigint,
        currentProposer: currentProposer as string,
        isOwned: (passBalance as bigint) > 0n,
        passBalance: passBalance as bigint,
        isCreator: (owner as string).toLowerCase() === userAccount.toLowerCase(),
      };
    } catch (err) {
      console.error('Failed to get experience info:', address, err);
      throw err;
    }
  }

  function experienceFromIndex(lhExp: ExperienceIndex, userAccount: string): ExperienceInfo {
    return {
      address: lhExp.address,
      owner: lhExp.creator,
      cid: lhExp.cid || '',
      priceEthWei: lhExp.priceEth ? parseEther(lhExp.priceEth) : 0n,
      currentProposer: ZERO_ADDRESS,
      isOwned: false,
      passBalance: 0n,
      isCreator: lhExp.creator.toLowerCase() === userAccount.toLowerCase(),
    };
  }

  // Lighthouse functions
  async function loadFromLighthouse(): Promise<ExperienceIndex[]> {
    if (!lighthouseHash) return [];
    return await lighthouseService.loadCreatorExperienceList(lighthouseHash);
  }

  async function syncExperiencesToLighthouse(experiences: ExperienceInfo[]) {
    if (!account) return;
    
    const lighthouseData: ExperienceIndex[] = experiences.map(exp => ({
      address: exp.address,
      creator: exp.owner,
      cid: exp.cid,
      priceEth: exp.priceEthWei > 0n ? formatEther(exp.priceEthWei) : undefined,
      createdAt: Date.now(),
    }));

    const newHash = await lighthouseService.saveCreatorExperienceList(account, lighthouseData);
    if (newHash) {
      setLighthouseHash(newHash);
      lighthouseService.saveHashToLocalStorage(account, newHash);
    }
  }

  async function addExperienceToLighthouse(experience: ExperienceInfo) {
    if (!account) return;
    
    const lighthouseData: ExperienceIndex = {
      address: experience.address,
      creator: experience.owner,
      cid: experience.cid,
      priceEth: experience.priceEthWei > 0n ? formatEther(experience.priceEthWei) : undefined,
      createdAt: Date.now(),
    };

    const newHash = await lighthouseService.addExperienceToList(account, lighthouseData, lighthouseHash);
    if (newHash) {
      setLighthouseHash(newHash);
      lighthouseService.saveHashToLocalStorage(account, newHash);
    }
  }

  // Check Lighthouse setup
  async function checkLighthouseSetup() {
    if (!account) return;
    
    try {
      const hash = lighthouseService.loadHashFromLocalStorage(account);
      if (hash) {
        setLighthouseHash(hash);
        setLighthouseEnabled(true);
      }
    } catch (err) {
      console.warn('Lighthouse setup check failed:', err);
    }
  }

  async function setupLighthouse() {
    if (!account) return;
    
    try {
      const apiKey = await promptForApiKey();
      if (apiKey) {
        setLighthouseEnabled(true);
        setShowLighthouseSetup(false);
        // Trigger initial sync
        await loadExperiences();
      }
    } catch (err) {
      console.error('Lighthouse setup failed:', err);
    }
  }

  // Manual experience addition
  async function addManualExperience() {
    if (!manualAddress || !account) return;
    
    try {
      setLoading('Adding experience...');
      const info = await getExperienceInfo(manualAddress, account);
      
      if (info.isCreator) {
        setCreatedExperiences(prev => [...prev, info]);
        if (lighthouseEnabled) {
          await addExperienceToLighthouse(info);
        }
      } else if (info.passBalance > 0n) {
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

  // Edit functions
  async function updatePrice(experienceAddress: string) {
    if (!wallet || !account || !editPrice) return;
    
    try {
      setLoading('Updating price...');
      const priceWei = parseEther(editPrice);
      
      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setPriceEthWei',
        args: [priceWei],
        account: account as `0x${string}`,
      });
      
      const hash = await wallet.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh data
      await loadExperiences();
      setEditingExperience('');
      setEditPrice('');
    } catch (err: any) {
      setError('Failed to update price: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  async function updateCid(experienceAddress: string) {
    if (!wallet || !account || !editCid) return;
    
    try {
      setLoading('Updating CID...');
      
      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setCid',
        args: [editCid],
        account: account as `0x${string}`,
      });
      
      const hash = await wallet.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh data
      await loadExperiences();
      setEditingExperience('');
      setEditCid('');
    } catch (err: any) {
      setError('Failed to update CID: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  async function updateProposer(experienceAddress: string) {
    if (!wallet || !account) return;
    
    try {
      setLoading('Updating proposer...');
      const proposerAddress = editProposer || ZERO_ADDRESS;
      
      const { request } = await publicClient.simulateContract({
        address: experienceAddress as `0x${string}`,
        abi: ExperienceAbi.abi,
        functionName: 'setCurrentProposer',
        args: [proposerAddress as `0x${string}`],
        account: account as `0x${string}`,
      });
      
      const hash = await wallet.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh data
      await loadExperiences();
      setEditingExperience('');
      setEditProposer('');
    } catch (err: any) {
      setError('Failed to update proposer: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  // Effects
  useEffect(() => {
    if (isConnected && !isWrongNetwork && account) {
      checkLighthouseSetup();
      loadExperiences();
    }
  }, [isConnected, isWrongNetwork, account]);

  useEffect(() => {
    if (!account) {
      setPurchaseHash('');
      return;
    }

    try {
      const stored = lighthouseService.loadPurchaseHashFromLocalStorage(account);
      if (stored) {
        setPurchaseHash(stored);
      }
    } catch (err) {
      console.warn('Purchase hash lookup failed:', err);
    }
  }, [account]);

  if (!isConnected) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>🎨 Creator Dashboard</h1>
        <p style={{ marginBottom: '30px', color: '#6b7280' }}>
          Connect your wallet to manage your experiences
        </p>
        <WalletButton size="lg" />
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>🎨 Creator Dashboard</h1>
        <p style={{ marginBottom: '30px', color: '#dc2626' }}>
          Please switch to Sepolia network
        </p>
        <WalletButton size="lg" />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px' }}>🎨 Creator Dashboard</h1>
          <p style={{ margin: '0', color: '#6b7280' }}>
            Manage your experiences and track purchases
          </p>
        </div>
        <WalletButton size="md" />
      </div>

      {/* Data Source Indicator */}
      <div style={{
        marginBottom: '20px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: dataSource === 'lighthouse' ? '#f0fdf4' : 
                         dataSource === 'blockchain' ? '#fef3c7' :
                         dataSource === 'hybrid' ? '#dbeafe' : '#f3f4f6',
        border: `1px solid ${dataSource === 'lighthouse' ? '#22c55e' : 
                             dataSource === 'blockchain' ? '#f59e0b' :
                             dataSource === 'hybrid' ? '#3b82f6' : '#9ca3af'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {dataSource === 'lighthouse' && <span>📦</span>}
          {dataSource === 'blockchain' && <span>🔗</span>}
          {dataSource === 'hybrid' && <span>⚡</span>}
          {dataSource === 'known' && <span>📋</span>}
          <span style={{ fontWeight: '500' }}>
            Data Source: {dataSource === 'lighthouse' ? 'Lighthouse (Instant)' :
                         dataSource === 'blockchain' ? 'Blockchain (Recent)' :
                         dataSource === 'hybrid' ? 'Hybrid (Lighthouse + Blockchain)' :
                         'Known Experiences'}
          </span>
          {lighthouseLoading && <span style={{ fontSize: '12px', color: '#6b7280' }}>📦 Loading...</span>}
          {blockchainLoading && <span style={{ fontSize: '12px', color: '#6b7280' }}>🔗 Syncing...</span>}
        </div>
      </div>

      {/* Lighthouse Setup */}
      {!lighthouseEnabled && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#92400e' }}>🚀 Enable Lighthouse Sync</h3>
              <p style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
                Sync your experiences across devices and get instant loading
              </p>
            </div>
            <button
              onClick={() => setShowLighthouseSetup(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Enable Sync
            </button>
          </div>
        </div>
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ margin: '0 0 16px 0' }}>🚀 Setup Lighthouse Sync</h2>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>
              Enter your Lighthouse API key to enable cross-device sync and instant loading.
            </p>
            <button
              onClick={setupLighthouse}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                marginBottom: '12px'
              }}
            >
              Enter API Key
            </button>
            <button
              onClick={() => setShowLighthouseSetup(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0', color: '#4b5563' }}>{loading}</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fca5a5',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0', color: '#dc2626' }}>❌ {error}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('created')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'created' ? '#059669' : '#f3f4f6',
              color: activeTab === 'created' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🎨 Created ({createdExperiences.length})
          </button>
          <button
            onClick={() => setActiveTab('purchased')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'purchased' ? '#059669' : '#f3f4f6',
              color: activeTab === 'purchased' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🎫 Purchased ({purchasedExperiences.length})
          </button>
        </div>

        {/* Add Experience Button */}
        {activeTab === 'created' && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowAddExperience(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ➕ Add Experience
            </button>
          </div>
        )}

        {/* Manual Add Experience Modal */}
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
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{ margin: '0 0 16px 0' }}>Add Experience</h2>
              <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>
                Enter the contract address of an experience you created or purchased.
              </p>
              <input
                type="text"
                placeholder="0x..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '20px'
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={addManualExperience}
                  disabled={!manualAddress}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: manualAddress ? 'pointer' : 'not-allowed',
                    fontSize: '16px',
                    opacity: manualAddress ? 1 : 0.5
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddExperience(false);
                    setManualAddress('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Experience List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {activeTab === 'created' ? (
            createdExperiences.length > 0 ? (
              createdExperiences.map((exp) => (
                <div key={exp.address} style={{
                  padding: '20px',
                  borderBottom: '1px solid #f3f4f6',
                  ':last-child': { borderBottom: 'none' }
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
                        {exp.address.slice(0, 6)}...{exp.address.slice(-4)}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '14px' }}>Price:</span>
                          <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                            {formatEther(exp.priceEthWei)} ETH
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '14px' }}>CID:</span>
                          <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                            {exp.cid.slice(0, 20)}...
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '14px' }}>Proposer:</span>
                          <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                            {exp.currentProposer === ZERO_ADDRESS ? 'None' : exp.currentProposer.slice(0, 6) + '...'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditingExperience(exp.address);
                          setEditPrice(formatEther(exp.priceEthWei));
                          setEditCid(exp.cid);
                          setEditProposer(exp.currentProposer === ZERO_ADDRESS ? '' : exp.currentProposer);
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Edit
                      </button>
                      <a
                        href={`/experience/${exp.address}/buy`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        View
                      </a>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {editingExperience === exp.address && (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>Edit Experience</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            Price (ETH)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            CID
                          </label>
                          <input
                            type="text"
                            value={editCid}
                            onChange={(e) => setEditCid(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            Proposer Address
                          </label>
                          <input
                            type="text"
                            placeholder="0x... (leave empty for none)"
                            value={editProposer}
                            onChange={(e) => setEditProposer(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => updatePrice(exp.address)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Update Price
                        </button>
                        <button
                          onClick={() => updateCid(exp.address)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Update CID
                        </button>
                        <button
                          onClick={() => updateProposer(exp.address)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
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
                            padding: '8px 16px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <p style={{ margin: '0', fontSize: '18px' }}>No created experiences yet</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                  Create your first experience or add an existing one
                </p>
              </div>
            )
          ) : (
            purchasedExperiences.length > 0 ? (
              purchasedExperiences.map((exp) => (
                <div key={exp.address} style={{
                  padding: '20px',
                  borderBottom: '1px solid #f3f4f6',
                  ':last-child': { borderBottom: 'none' }
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
                        {exp.address.slice(0, 6)}...{exp.address.slice(-4)}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '14px' }}>Passes:</span>
                          <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                            {exp.passBalance.toString()}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '14px' }}>Creator:</span>
                          <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                            {exp.owner.slice(0, 6)}...{exp.owner.slice(-4)}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '14px' }}>CID:</span>
                          <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                            {exp.cid.slice(0, 20)}...
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <a
                        href={`/experience/${exp.address}/buy`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        View Experience
                      </a>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <p style={{ margin: '0', fontSize: '18px' }}>No purchased experiences yet</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                  Buy access passes to unlock experiences
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
