"use client";
import { useState } from 'react';
import { formatEther } from 'viem';
import ExperienceAbi from '../../abi/Experience.json';
import { useWallet } from '../../contexts/WalletContext';
import WalletButton from '../../components/WalletButton';
import { publicClient } from '../../lib/viemClient';

interface ExperienceResult {
  address: string;
  owner: string;
  cid: string;
  priceEthWei: bigint;
  passBalance: bigint;
  isCreator: boolean;
  error?: string;
}

export default function DebugPage() {
  const { account, isConnected } = useWallet();
  const [results, setResults] = useState<ExperienceResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [customAddress, setCustomAddress] = useState<string>('');

  const knownAddresses = [
    '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A',
    '0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F',
  ];

  async function checkExperience(address: string): Promise<ExperienceResult> {
    try {
      console.log(`🔍 Checking experience: ${address}`);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
      );

      const dataPromise = Promise.all([
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
        account ? publicClient.readContract({
          address: address as `0x${string}`,
          abi: ExperienceAbi.abi,
          functionName: 'balanceOf',
          args: [account as `0x${string}`, 1n],
        }) : 0n,
      ]);

      const [owner, cid, priceEthWei, passBalance] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as [string, string, bigint, bigint];

      return {
        address,
        owner: owner as string,
        cid: cid as string,
        priceEthWei: priceEthWei as bigint,
        passBalance: passBalance as bigint,
        isCreator: account ? (owner as string).toLowerCase() === account.toLowerCase() : false,
      };
    } catch (err: any) {
      return {
        address,
        owner: '',
        cid: '',
        priceEthWei: 0n,
        passBalance: 0n,
        isCreator: false,
        error: err.message,
      };
    }
  }

  async function checkAllKnownExperiences() {
    setLoading(true);
    const results: ExperienceResult[] = [];
    
    for (const address of knownAddresses) {
      const result = await checkExperience(address);
      results.push(result);
    }
    
    setResults(results);
    setLoading(false);
  }

  async function checkCustomExperience() {
    if (!customAddress.trim()) return;
    
    setLoading(true);
    const result = await checkExperience(customAddress);
    setResults([result]);
    setLoading(false);
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
            🔧 Debug Experience
          </a>
          <a 
            href="/creator"
            style={{
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            🎨 Back to Creator
          </a>
        </div>
        
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
              Connect your wallet to debug experiences
            </p>
            <WalletButton size="lg" />
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{ margin: '0 0 30px 0', color: '#1e293b' }}>🔧 Experience Debug Tool</h1>
            
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>Connected Account:</h3>
              <div style={{ 
                fontFamily: 'monospace', 
                backgroundColor: '#f3f4f6', 
                padding: '10px', 
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                {account}
              </div>
            </div>

            {/* Check Known Experiences */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>Check Known Experiences:</h3>
              <button
                onClick={checkAllKnownExperiences}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {loading ? '🔄 Checking...' : '🔍 Check All Known'}
              </button>
            </div>

            {/* Check Custom Experience */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>Check Custom Experience:</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="0x..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
                <button
                  onClick={checkCustomExperience}
                  disabled={loading || !customAddress.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: loading || !customAddress.trim() ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: loading || !customAddress.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Check
                </button>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 20px 0', color: '#374151' }}>Results:</h3>
                {results.map((result, index) => (
                  <div 
                    key={index}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '15px',
                      backgroundColor: result.error ? '#fef2f2' : result.isCreator ? '#f0fdf4' : '#f8fafc'
                    }}
                  >
                    <div style={{ fontFamily: 'monospace', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold' }}>
                      {result.address}
                    </div>
                    
                    {result.error ? (
                      <div style={{ color: '#dc2626' }}>
                        ❌ Error: {result.error}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div>
                          <strong>Owner:</strong> 
                          <span style={{ fontFamily: 'monospace', marginLeft: '8px', fontSize: '12px' }}>
                            {result.owner}
                          </span>
                          {result.isCreator && <span style={{ color: '#059669', marginLeft: '8px' }}>✅ YOU ARE THE CREATOR</span>}
                        </div>
                        <div>
                          <strong>Content ID:</strong> 
                          <span style={{ fontFamily: 'monospace', marginLeft: '8px', fontSize: '12px' }}>
                            {result.cid}
                          </span>
                        </div>
                        <div>
                          <strong>Price:</strong> 
                          <span style={{ marginLeft: '8px', color: '#059669', fontWeight: 'bold' }}>
                            {formatEther(result.priceEthWei)} ETH
                          </span>
                        </div>
                        <div>
                          <strong>Your Passes:</strong> 
                          <span style={{ marginLeft: '8px', fontWeight: 'bold', color: result.passBalance > 0n ? '#059669' : '#6b7280' }}>
                            {result.passBalance.toString()}
                          </span>
                          {result.passBalance > 0n && <span style={{ marginLeft: '8px' }}>🎫</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
