"use client";
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import ExperienceAbi from '../../../../abi/Experience.json';
import { useWallet } from '../../../../contexts/WalletContext';
import WalletButton from '../../../../components/WalletButton';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC || 'https://rpc.sepolia.org'),
});

export default function BuyPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
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
  const [showContent, setShowContent] = useState<boolean>(false);

  useEffect(() => {
    loadContractData();
  }, [experience]);

  useEffect(() => {
    if (isConnected && !isWrongNetwork) {
      loadPassBalance();
    }
  }, [isConnected, isWrongNetwork, account, txHash]);

  async function loadContractData() {
    try {
      setLoading('Loading contract data...');
      
      const [price, cidResult, proposer, ownerResult] = await Promise.all([
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
      ]);

      setPriceEthWei(price as bigint);
      setCid(cidResult as string);
      setCurrentProposer(proposer as string);
      setOwner(ownerResult as string);

    } catch (err: any) {
      console.error('Failed to load contract data:', err);
      setError('Failed to load experience data: ' + err.message);
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
        args: [account as `0x${string}`, 1n], // PASS_ID = 1
      });
      
      setPassBalance(balance as bigint);
      setShowContent(balance > 0n);
    } catch (err) {
      console.error('Failed to load pass balance:', err);
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
      
      setLoading('');
      await loadPassBalance(); // Refresh balance
      
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
            {showContent && passBalance > 0n ? (
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
                  <h2 style={{ margin: '0 0 16px 0', color: '#15803d' }}>Welcome to the Experience!</h2>
                  <p style={{ margin: '0 0 20px 0', color: '#166534', fontSize: '18px' }}>
                    You own {passBalance.toString()} access pass{passBalance > 1n ? 'es' : ''} for this experience.
                  </p>
                  
                  {cid && (
                    <div style={{
                      backgroundColor: 'white',
                      padding: '20px',
                      borderRadius: '8px',
                      marginTop: '20px',
                      textAlign: 'left'
                    }}>
                      <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Exclusive Content</h3>
                      <p style={{ margin: '0', color: '#4b5563' }}>Content ID: {cid}</p>
                      <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                        This is your token-gated content. Only pass holders can see this!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 style={{ margin: '0 0 16px 0', fontSize: '36px', color: '#1e293b' }}>
                    🎫 Buy Access Pass
                  </h1>
                  <p style={{ margin: '0', fontSize: '18px', color: '#6b7280' }}>
                    Purchase an exclusive soulbound NFT pass to access this experience
                  </p>
                </div>

                {/* Experience Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
                    <p style={{ 
                      margin: '0', 
                      fontFamily: 'monospace', 
                      fontSize: '14px',
                      color: '#4b5563',
                      wordBreak: 'break-all'
                    }}>
                      {owner}
                    </p>
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
                  </div>

                  {error && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      border: '1px solid #fca5a5',
                      marginBottom: '20px'
                    }}>
                      <p style={{ margin: '0', color: '#dc2626', fontSize: '14px' }}>
                        ❌ {error}
                      </p>
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
