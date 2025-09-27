"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatEther } from 'viem';
import ExperienceAbi from '../../../../abi/Experience.json';
import { useWallet } from '../../../../contexts/WalletContext';
import WalletButton from '../../../../components/WalletButton';
import { publicClient } from '../../../../lib/viemClient';
import { fetchExperienceMetadata } from '../../../../lib/experienceMetadata';
import { lighthouseService } from '../../../../lib/lighthouse';
import { resolveAddressIdentity, formatAddress, AddressIdentity } from '../../../../lib/identity';

export default function BuyPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const router = useRouter();
  const { account, wallet, isConnected, isWrongNetwork } = useWallet();
  const [priceEthWei, setPriceEthWei] = useState<bigint>(0n);
  const [cid, setCid] = useState<string>('');
  const [currentProposer, setCurrentProposer] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [loading, setLoading] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [passBalance, setPassBalance] = useState<bigint>(0n);
  const [experienceName, setExperienceName] = useState<string>('');
  const [experienceSummary, setExperienceSummary] = useState<string>('');
  const [metadataLoading, setMetadataLoading] = useState<boolean>(false);
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(500);
  const [proposerFeeBps, setProposerFeeBps] = useState<number>(1000);
  const [purchaseHash, setPurchaseHash] = useState<string>('');
  const [ownerIdentity, setOwnerIdentity] = useState<AddressIdentity | null>(null);
  const [proposerIdentity, setProposerIdentity] = useState<AddressIdentity | null>(null);

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const salesPaused = priceEthWei === 0n;
  const totalCostWei = priceEthWei * BigInt(qty);
  const platformAmountWei = totalCostWei * BigInt(platformFeeBps) / 10_000n;
  const proposerAmountWei = totalCostWei * BigInt(proposerFeeBps) / 10_000n;
  const creatorShareBps = Math.max(0, 10_000 - platformFeeBps - proposerFeeBps);
  const creatorAmountWei = totalCostWei - platformAmountWei - proposerAmountWei;
  const safeCreatorAmountWei = creatorAmountWei >= 0n ? creatorAmountWei : 0n;
  const hasProposer = Boolean(currentProposer && currentProposer !== ZERO_ADDRESS);

  useEffect(() => {
    loadContractData();
  }, [experience]);

  useEffect(() => {
    if (isConnected && !isWrongNetwork) {
      loadPassBalance();
    }
  }, [isConnected, isWrongNetwork, account, txHash]);

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

  useEffect(() => {
    if (!cid) {
      setExperienceName('');
      setExperienceSummary('');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadMetadata() {
      try {
        setMetadataLoading(true);
        setExperienceName('');
        setExperienceSummary('');

        const metadata = await fetchExperienceMetadata(cid, controller.signal);
        if (cancelled || !metadata) return;

        setExperienceName(metadata.name);
        setExperienceSummary(metadata.description);
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    }

    loadMetadata();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cid]);

  async function loadContractData() {
    try {
      setLoading('Loading contract data...');
      setError('');
      
      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Contract data loading timeout')), 8000)
      );

      const dataPromise = Promise.all([
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
          functionName: 'owner',
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

      const [price, cidResult, proposer, ownerResult, platformBps, proposerBps] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as [bigint, string, string, string, number | bigint, number | bigint];

      setPriceEthWei(price);
      setCid(cidResult);
      setCurrentProposer(proposer);
      setOwner(ownerResult);
      setPlatformFeeBps(Number(platformBps));
      setProposerFeeBps(Number(proposerBps));

    } catch (err: any) {
      console.error('Failed to load contract data:', err);
      
      // Handle specific error types
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setError('Network request was cancelled. Please try refreshing the page.');
      } else if (err.message?.includes('timeout')) {
        setError('Request timed out. Please check your network connection and try again.');
      } else if (err.message?.includes('Contract read failed')) {
        setError('Invalid experience contract. Please verify the contract address.');
      } else {
        setError('Failed to load experience data: ' + (err.shortMessage || err.message));
      }
    } finally {
      setLoading('');
    }
  }

  async function loadPassBalance() {
    if (!account) return;
    
    try {
      // Add timeout for balance loading too
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Balance loading timeout')), 5000)
      );

      const balancePromise = publicClient.readContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'balanceOf',
        args: [account as `0x${string}`, 1n], // PASS_ID = 1
      });

      const balance = await Promise.race([
        balancePromise,
        timeoutPromise
      ]) as bigint;

      setPassBalance(balance);
    } catch (err: any) {
      console.error('Failed to load pass balance:', err);
      // Don't show error for balance loading failure, just log it
      if (err.name !== 'AbortError' && !err.message?.includes('timeout')) {
        console.warn('Balance check failed, assuming no passes:', err.message);
      }
      setPassBalance(0n);
    }
  }

  async function recordPurchase(txHash: string, quantity: number) {
    if (!account) return;

    try {
      const purchaseRecord = {
        experience,
        purchaser: account,
        totalQuantity: quantity,
        lastPurchaseAt: Date.now(),
        lastTxHash: txHash,
        creator: owner,
        cid,
        priceEth: priceEthWei > 0n ? formatEther(priceEthWei) : undefined,
      };

      const newHash = await lighthouseService.addPurchaseToList(
        account,
        purchaseRecord,
        purchaseHash || undefined
      );

      if (newHash) {
        setPurchaseHash(newHash);
        lighthouseService.savePurchaseHashToLocalStorage(account, newHash);
      }
    } catch (err) {
      console.warn('Failed to persist purchase to Lighthouse:', err);
    }
  }

  async function handleBuy() {
    if (!wallet || !account) {
      setError('Please connect your wallet first');
      return;
    }

    if (isWrongNetwork) {
      setError('Please switch to Sepolia network first');
      return;
    }

    try {
      setLoading('Preparing transaction...');
      setError('');
      
      const value = priceEthWei * BigInt(qty);
      
      const { request } = await publicClient.simulateContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'buyWithEth',
        args: [BigInt(qty)],
        account: account as `0x${string}`,
        value,
      });

      setLoading('Please confirm transaction in wallet...');
      const hash = await wallet.writeContract(request);
      setTxHash(hash);
      
      setLoading('Transaction submitted, waiting for confirmation...');
      await publicClient.waitForTransactionReceipt({ hash });

      setLoading('Purchase confirmed! Redirecting...');
      await recordPurchase(hash, qty);
      setTimeout(() => {
        router.push(`/experience/${experience}`);
      }, 1500);

    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError('Transaction failed: ' + (err.shortMessage || err.message));
      setLoading('');
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto 40px auto',
        padding: '0 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a 
            href="/"
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'white',
              textDecoration: 'none'
            }}
          >
            🌟 Experience Protocol
          </a>
          <a 
            href="/experience"
            style={{
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'all 0.2s'
            }}
          >
            📊 My Passes
          </a>
          <a 
            href="/creator"
            style={{
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'all 0.2s'
            }}
          >
            🎨 Creator Hub
          </a>
          <a 
            href="/create"
            style={{
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'all 0.2s'
            }}
          >
            🌍 Create New
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔗</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Connect Your Wallet</h2>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>
              Connect your wallet to purchase an access pass
            </p>
            <WalletButton size="lg" />
          </div>
        ) : isWrongNetwork ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
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
            {/* Main Content */}
            {passBalance > 0n && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '12px',
                  border: '2px solid #22c55e'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                  <h2 style={{ margin: '0 0 16px 0', color: '#15803d' }}>
                    You already own this experience!
                  </h2>
                  <p style={{ margin: '0 0 20px 0', color: '#166534', fontSize: '18px' }}>
                    {experienceName || 'This experience'} is now unlocked.
                  </p>
                  <p style={{ margin: '0 0 24px 0', color: '#166534', fontSize: '16px' }}>
                    Passes held: {passBalance.toString()} token{passBalance > 1n ? 's' : ''}
                  </p>
                  <button
                    onClick={() => router.push(`/experience/${experience}`)}
                    style={{
                      padding: '14px 28px',
                      backgroundColor: '#15803d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    🚀 View Unlocked Experience
                  </button>
                </div>
              </div>
            )}

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '40px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ margin: '0 0 16px 0', fontSize: '36px', color: '#1e293b' }}>
                  🎫 {experienceName ? `Buy Access to ${experienceName}` : 'Buy Access Pass'}
                </h1>
                {metadataLoading ? (
                  <p style={{ margin: '0', fontSize: '18px', color: '#6b7280' }}>
                    Loading experience details...
                  </p>
                ) : (
                  <p style={{ margin: '0', fontSize: '18px', color: '#6b7280' }}>
                    {experienceSummary || 'Purchase an exclusive soulbound NFT pass to unlock this experience.'}
                  </p>
                )}
              </div>

              {salesPaused && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #facc15',
                  color: '#92400e'
                }}>
                  Sales are currently paused by the creator. You can still review the experience details below.
                </div>
              )}

              {/* Experience Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
              }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>💰 Price</h3>
                  <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                    {formatEther(priceEthWei)} ETH
                  </p>
                  <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                    per access pass
                  </p>
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>👑 Creator</h3>
                  <p
                    title={owner}
                    style={{
                      margin: '0',
                      fontSize: '14px',
                      color: '#4b5563',
                      wordBreak: 'break-all'
                    }}
                  >
                    {formatAddress(owner, ownerIdentity)}
                  </p>
                  {ownerIdentity?.verified && (
                    <span style={{
                      marginTop: '8px',
                      display: 'inline-block',
                      fontSize: '12px',
                      color: '#0f766e'
                    }}>
                      ✅ Self-verified
                    </span>
                  )}
                </div>

                {hasProposer && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>🤝 Current Proposer</h3>
                    <p
                      title={currentProposer}
                      style={{
                        margin: '0',
                        fontSize: '14px',
                        color: '#4b5563',
                        wordBreak: 'break-all'
                      }}
                    >
                      {formatAddress(currentProposer, proposerIdentity)}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      Earns {proposerFeeBps / 100}% of each sale
                    </p>
                  </div>
                )}

                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>📦 Experience</h3>
                  <p style={{ margin: '0', fontWeight: 600, color: '#1e293b' }}>
                    {experienceName || 'Experience Pass'}
                  </p>
                  <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                    {experienceSummary ? experienceSummary : 'Metadata loaded from contract CID.'}
                  </p>
                  {cid && (
                    <p style={{
                      margin: '12px 0 0 0',
                      fontSize: '12px',
                      color: '#94a3b8',
                      wordBreak: 'break-all'
                    }}>
                      CID: {cid}
                    </p>
                  )}
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>💸 Revenue Split</h3>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '18px',
                    color: '#475569',
                    fontSize: '14px'
                  }}>
                    <li>Creator: {(creatorShareBps / 100).toFixed(2)}%</li>
                    <li>Platform: {(platformFeeBps / 100).toFixed(2)}%</li>
                    <li>Proposer: {(proposerFeeBps / 100).toFixed(2)}%</li>
                  </ul>
                </div>
              </div>

              {/* Purchase Form */}
              <div style={{
                padding: '30px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Purchase Details</h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280' }}>Total Cost:</span>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#059669'
                    }}>
                      {formatEther(priceEthWei * BigInt(qty))} ETH
                    </span>
                  </div>
                  {totalCostWei > 0n && (
                    <div style={{
                      marginTop: '12px',
                      fontSize: '12px',
                      color: '#64748b',
                      lineHeight: '18px'
                    }}>
                      <div>Creator receives {formatEther(safeCreatorAmountWei)} ETH</div>
                      <div>Platform receives {formatEther(platformAmountWei)} ETH</div>
                      {hasProposer ? (
                        <div>Proposer receives {formatEther(proposerAmountWei)} ETH</div>
                      ) : (
                        <div>No proposer set — full share goes to creator</div>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fef2f2',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: '14px' }}>
                      ❌ {error}
                    </p>
                    {(error.includes('timeout') || error.includes('aborted') || error.includes('cancelled')) && (
                      <button
                        onClick={() => {
                          setError('');
                          loadContractData();
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        🔄 Retry
                      </button>
                    )}
                  </div>
                )}

                {txHash && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #22c55e',
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: '0', color: '#15803d', fontSize: '14px' }}>
                      ✅ Transaction:
                      <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '4px', color: '#059669' }}
                      >
                        View on Etherscan ↗
                      </a>
                    </p>
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={loading !== '' || priceEthWei === 0n}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: loading !== '' || priceEthWei === 0n ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: loading !== '' || priceEthWei === 0n ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {loading || `🎫 Buy ${qty} Access Pass${qty > 1 ? 'es' : ''}`}
                </button>
              </div>

              {/* Info */}
              <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                border: '1px solid #f59e0b'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#92400e' }}>ℹ️ About Access Passes</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#92400e' }}>
                  <li>Passes are soulbound NFTs (non-transferable)</li>
                  <li>One-time purchase grants permanent access</li>
                  <li>Payments are automatically split between creator, collaborators, and platform</li>
                  <li>Built on Ethereum Sepolia testnet</li>
                </ul>
              </div>
            </div>
          </>
          )}
        </div>
    </div>
  );
}
