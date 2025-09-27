"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatEther } from 'viem';
import ExperienceAbi from '../../../abi/Experience.json';
import { useWallet } from '../../../contexts/WalletContext';
import WalletButton from '../../../components/WalletButton';
import { publicClient } from '../../../lib/viemClient';
import { fetchExperienceMetadata, ExperienceMetadata } from '../../../lib/experienceMetadata';
import { resolveAddressIdentity, formatAddress, AddressIdentity } from '../../../lib/identity';

const PASS_ID = 1n;

interface ExperienceItem {
  name?: string;
  description?: string;
  category?: string;
  duration?: string;
  priceRange?: string;
  tags?: string[];
}

export default function ExperienceContentPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const { account, isConnected, isWrongNetwork } = useWallet();

  const [loading, setLoading] = useState<string>('Loading experience...');
  const [error, setError] = useState<string>('');

  const [owner, setOwner] = useState<string>('');
  const [priceEthWei, setPriceEthWei] = useState<bigint>(0n);
  const [cid, setCid] = useState<string>('');
  const [passBalance, setPassBalance] = useState<bigint>(0n);

  const [metadata, setMetadata] = useState<ExperienceMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState<boolean>(false);
  const [currentProposer, setCurrentProposer] = useState<string>('');
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(500);
  const [proposerFeeBps, setProposerFeeBps] = useState<number>(1000);
  const [ownerIdentity, setOwnerIdentity] = useState<AddressIdentity | null>(null);
  const [proposerIdentity, setProposerIdentity] = useState<AddressIdentity | null>(null);

  const experienceName = metadata?.name || 'Experience Pass';
  const experienceSummary = metadata?.description || '';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const hasProposer = Boolean(currentProposer && currentProposer !== ZERO_ADDRESS);
  const creatorShareBps = Math.max(0, 10_000 - platformFeeBps - proposerFeeBps);

  useEffect(() => {
    loadContractData();
  }, [experience]);

  useEffect(() => {
    if (isConnected && !isWrongNetwork) {
      loadPassBalance();
    } else {
      setPassBalance(0n);
    }
  }, [isConnected, isWrongNetwork, account, experience]);

  useEffect(() => {
    if (!cid) {
      setMetadata(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadMetadata() {
      setMetadataLoading(true);
      try {
        const result = await fetchExperienceMetadata(cid, controller.signal);
        if (!cancelled) {
          setMetadata(result);
        }
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

  useEffect(() => {
    let cancelled = false;

    async function loadOwnerIdentity() {
      if (!owner) {
        setOwnerIdentity(null);
        return;
      }
      const identity = await resolveAddressIdentity(owner);
      if (!cancelled) setOwnerIdentity(identity);
    }

    loadOwnerIdentity();

    return () => {
      cancelled = true;
    };
  }, [owner]);

  useEffect(() => {
    let cancelled = false;

    async function loadProposerIdentity() {
      if (!hasProposer || !currentProposer) {
        setProposerIdentity(null);
        return;
      }
      const identity = await resolveAddressIdentity(currentProposer);
      if (!cancelled) setProposerIdentity(identity);
    }

    loadProposerIdentity();

    return () => {
      cancelled = true;
    };
  }, [currentProposer, hasProposer]);

  async function loadContractData() {
    try {
      setLoading('Loading experience...');
      setError('');

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
      setPlatformFeeBps(Number(platformBps));
      setProposerFeeBps(Number(proposerBps));
    } catch (err: any) {
      console.error('Failed to load experience:', err);
      setError(err?.message || 'Failed to load experience');
    } finally {
      setLoading('');
    }
  }

  async function loadPassBalance() {
    if (!account) return;

    try {
      const balance = await publicClient.readContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'balanceOf',
        args: [account as `0x${string}`, PASS_ID],
      });

      setPassBalance(balance as bigint);
    } catch (err) {
      console.warn('Failed to load pass balance:', err);
      setPassBalance(0n);
    }
  }

  const experienceItems: ExperienceItem[] = useMemo(() => {
    const rawItems = metadata?.raw?.items;
    return Array.isArray(rawItems) ? rawItems : [];
  }, [metadata]);

  const additionalNotes: string | undefined = useMemo(() => {
    const notes = metadata?.raw?.additionalNotes;
    return typeof notes === 'string' ? notes : undefined;
  }, [metadata]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        color: 'white'
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 700 }}>
              {experienceName}
            </h1>
            <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.7)' }}>
              {experienceSummary || 'Token-gated experience content'}
            </p>
          </div>
          <WalletButton size="md" />
        </header>

        {loading && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(15, 118, 110, 0.2)',
            border: '1px solid rgba(45, 212, 191, 0.4)'
          }}>
            {loading}
          </div>
        )}

        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(248, 113, 113, 0.4)'
          }}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {!isConnected ? (
          <div style={{
            textAlign: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '12px',
            padding: '48px 24px'
          }}>
            <h2 style={{ margin: '0 0 16px 0' }}>Connect your wallet to continue</h2>
            <p style={{ margin: '0 0 24px 0', color: 'rgba(255,255,255,0.7)' }}>
              You need to hold the access pass to view this experience.
            </p>
            <WalletButton size="lg" />
          </div>
        ) : isWrongNetwork ? (
          <div style={{
            textAlign: 'center',
            backgroundColor: 'rgba(69, 10, 10, 0.7)',
            borderRadius: '12px',
            padding: '48px 24px'
          }}>
            <h2 style={{ margin: '0 0 16px 0' }}>Switch to Sepolia</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>
              This experience lives on the Sepolia testnet. Switch networks and refresh the page.
            </p>
          </div>
        ) : passBalance === 0n ? (
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <h2 style={{ margin: '0 0 16px 0' }}>Access locked</h2>
            <p style={{ margin: '0 0 24px 0', color: 'rgba(255,255,255,0.7)' }}>
              You do not own a pass for this experience yet.
            </p>
            <Link
              href={`/experience/${experience}/buy`}
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              🎫 Buy Access Pass
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '20px'
          }}>
            <section style={{
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '12px',
              padding: '32px'
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>Experience Overview</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px'
              }}>
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)'
                }}>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.6)' }}>Passes owned</p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{passBalance.toString()}</p>
                </div>
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)'
                }}>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.6)' }}>Creator</p>
                  <p style={{
                    margin: 0,
                    wordBreak: 'break-all'
                  }} title={owner}>
                    {formatAddress(owner, ownerIdentity)}
                  </p>
                  {ownerIdentity?.verified && <span style={{ color: '#2dd4bf', fontSize: '12px' }}>✅ Self-verified</span>}
                </div>
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)'
                }}>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.6)' }}>Current price</p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                    {formatEther(priceEthWei)} ETH
                  </p>
                </div>
                {hasProposer && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)'
                  }}>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.6)' }}>Current proposer</p>
                    <p style={{
                      margin: 0,
                      wordBreak: 'break-all'
                    }} title={currentProposer}>
                      {formatAddress(currentProposer, proposerIdentity)}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(148, 163, 184, 0.9)' }}>
                      Earns {(proposerFeeBps / 100).toFixed(2)}% of every sale
                    </p>
                  </div>
                )}
                {cid && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)'
                  }}>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.6)' }}>Content ID</p>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      wordBreak: 'break-all'
                    }}>
                      {cid}
                    </p>
                  </div>
                )}
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)'
                }}>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.6)' }}>Revenue split</p>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '18px',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '13px'
                  }}>
                    <li>Creator: {(creatorShareBps / 100).toFixed(2)}%</li>
                    <li>Platform: {(platformFeeBps / 100).toFixed(2)}%</li>
                    <li>Proposer: {(proposerFeeBps / 100).toFixed(2)}%</li>
                  </ul>
                </div>
              </div>
            </section>

            <section style={{
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '12px',
              padding: '32px'
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>Unlocked Content</h2>
              {metadataLoading ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading content...</p>
              ) : experienceItems.length > 0 ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {experienceItems.map((item, index) => (
                    <div
                      key={`${item.name || 'item'}-${index}`}
                      style={{
                        padding: '20px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)'
                      }}
                    >
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
                        {item.name || `Item ${index + 1}`}
                      </h3>
                      {item.description && (
                        <p style={{ margin: '0 0 8px 0', color: 'rgba(255,255,255,0.7)' }}>
                          {item.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'rgba(255,255,255,0.6)' }}>
                        {item.category && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.4)'
                          }}>
                            {item.category}
                          </span>
                        )}
                        {item.duration && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)'
                          }}>
                            ⏱ {item.duration}
                          </span>
                        )}
                        {item.priceRange && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(236, 72, 153, 0.2)',
                            border: '1px solid rgba(236, 72, 153, 0.4)'
                          }}>
                            💵 {item.priceRange}
                          </span>
                        )}
                        {item.tags?.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(168, 85, 247, 0.2)',
                              border: '1px solid rgba(168, 85, 247, 0.4)'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {experienceSummary || 'The creator has not published detailed content yet.'}
                </p>
              )}

              {additionalNotes && (
                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px' }}>Additional Notes</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>{additionalNotes}</p>
                </div>
              )}
            </section>

            <section style={{
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '12px',
              padding: '32px'
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>Need another pass?</h2>
              <p style={{ margin: '0 0 24px 0', color: 'rgba(255,255,255,0.7)' }}>
                You can purchase additional passes for teammates or collaborators if needed.
              </p>
              <Link
                href={`/experience/${experience}/buy`}
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: 600
                }}
              >
                🔁 Buy More Passes
              </Link>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
