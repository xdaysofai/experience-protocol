"use client";
import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import ExperienceAbi from '../../../../abi/Experience.json';
import { getInjectedProvider } from '../../../../lib/provider';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC || 'https://rpc.sepolia.org'),
});

async function buyWithEth({
  experience, qty, priceEthWei,
}: { experience: `0x${string}`, qty: bigint, priceEthWei: bigint }) {
  const provider = await getInjectedProvider();
  const [account] = await provider.request({ method: 'eth_requestAccounts' });
  const walletClient = createWalletClient({ chain: sepolia, transport: custom(provider) });
  const value = priceEthWei * qty;
  
  const { request } = await publicClient.simulateContract({
    address: experience,
    abi: ExperienceAbi.abi,
    functionName: 'buyWithEth',
    args: [qty],
    account,
    value,
  });
  return walletClient.writeContract(request);
}

export default function BuyPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const [wallet, setWallet] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [account, setAccount] = useState<string>('');
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
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);

  useEffect(() => {
    loadContractData();
  }, [experience]);

  useEffect(() => {
    if (account) {
      checkPassBalance();
    }
  }, [account, experience]);

  async function checkPassBalance() {
    if (!account) return;
    
    try {
      const balance = await publicClient.readContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'balanceOf',
        args: [account as `0x${string}`, 1n], // PASS_ID = 1
      }) as bigint;
      
      setPassBalance(balance);
      console.log(`User has ${balance.toString()} passes`);
    } catch (err) {
      console.error('Failed to check pass balance:', err);
    }
  }

  async function loadContractData() {
    try {
        const [price, cidData, proposer, ownerData] = await Promise.all([
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
      setCid(cidData as string);
      setCurrentProposer(proposer as string);
      setOwner(ownerData as string);
    } catch (err) {
      console.error('Failed to load contract data:', err);
      setError('Failed to load contract data');
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
      setError('');
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to wallet
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
          setIsWrongNetwork(false);
          setError('');
          return true;
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
          setError('Failed to add Sepolia network to wallet');
          return false;
        }
      } else {
        console.error('Failed to switch to Sepolia:', error);
        setError('Failed to switch to Sepolia network');
        return false;
      }
    }
  }

  async function connectWallet() {
    console.log('🔄 Starting wallet connection...');
    
    try {
      setLoading('Connecting...');
      setError('');
      
      // Check if MetaMask is available
      if (typeof window === 'undefined') {
        throw new Error('Window not available');
      }
      
      console.log('🌐 Getting provider...');
      const provider = await getInjectedProvider();
      
      if (!provider) {
        throw new Error('No wallet provider found. Please install MetaMask.');
      }
      
      console.log('📱 Provider found, requesting accounts...');
      
      // Request accounts with better error handling
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }).catch((error: any) => {
        if (error.code === 4001) {
          throw new Error('User rejected wallet connection');
        }
        throw error;
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      
      console.log('✅ Accounts received:', accounts);
      
      // Check current chain
      const chainId = await provider.request({ method: 'eth_chainId' });
      console.log('🔗 Current chain ID:', chainId);
      
      setAccount(accounts[0]);
      console.log('👤 Account set:', accounts[0]);
      
      const walletClient = createWalletClient({ 
        chain: sepolia, 
        transport: custom(provider) 
      });
      setWallet(walletClient);
      console.log('🎯 Wallet client created');
      
      const wrongNetwork = chainId !== '0xaa36a7';
      setIsWrongNetwork(wrongNetwork);
      
      if (wrongNetwork) {
        setError('⚠️ Wrong network! Please click "Switch to Sepolia" button above.');
      } else {
        setError('');
        console.log('✅ Connected to Sepolia successfully!');
      }
      
    } catch (err: any) {
      console.error('❌ Wallet connection failed:', err);
      setError('Connection failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading('');
    }
  }

  async function handleBuy() {
    if (!account || !wallet) {
      setError('Please connect your wallet first');
      return;
    }
    
    setLoading('Purchasing...');
    setError('');
    setTxHash('');
    
    try {
      const value = priceEthWei * BigInt(qty);
      
      const { request } = await publicClient.simulateContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'buyWithEth',
        args: [BigInt(qty)],
        account: account as `0x${string}`,
        value,
      });
      
      const hash = await wallet.writeContract(request);
      setTxHash(hash);
      
      // Wait for receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', receipt);
      
      // Refresh pass balance after purchase
      await checkPassBalance();
    } catch (err: any) {
      console.error('Buy failed:', err);
      
      // Check for chain mismatch error
      if (err.message?.includes('chain') || err.message?.includes('Chain')) {
        setError('❌ Wrong network! Please switch to Sepolia (Chain ID: 11155111)');
      } else if (err.message?.includes('insufficient funds')) {
        setError('❌ Insufficient ETH balance');
      } else if (err.message?.includes('User rejected')) {
        setError('❌ Transaction rejected by user');
      } else {
        setError('❌ ' + (err.message || 'Transaction failed'));
      }
    } finally {
      setLoading('');
    }
  }

  const totalCost = priceEthWei * BigInt(qty);

  function disconnectWallet() {
    setAccount('');
    setWallet(null);
    setError('');
    setSuccess('');
    setTxHash('');
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
            🎫 Buy Experience Pass
          </h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a 
              href="/experience"
              style={{
                padding: '6px 12px',
                backgroundColor: '#6366f1',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              📊 My Passes
            </a>
            <a 
              href="/creator"
              style={{
                padding: '6px 12px',
                backgroundColor: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              🎨 Creator Hub
            </a>
            <a 
              href="/create"
              style={{
                padding: '6px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              🌍 Create New
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
                        onClick={() => {
                console.log('Connect wallet button clicked!');
                connectWallet();
              }}
              disabled={loading !== ''}
              style={{
                padding: '12px 24px',
                backgroundColor: loading !== '' ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: loading !== '' ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                zIndex: 10,
                position: 'relative'
              }}
            >
              {loading || 'Connect Wallet'}
                      </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Left Column - Purchase */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'fit-content'
        }}>
          <h2 style={{ marginTop: 0, color: '#1e293b', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Purchase Details
          </h2>

          {!account ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👛</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Connect Your Wallet</h3>
              <p style={{ margin: '0 0 20px 0' }}>Please connect your MetaMask wallet to purchase passes</p>
              
              {/* Debug/Alternative Connect Button */}
                      <button 
                        onClick={() => {
                  console.log('Alternative connect button clicked!');
                  alert('Button works! Connecting wallet...');
                  connectWallet();
                }}
                style={{
                  padding: '16px 32px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                🚀 Connect MetaMask Wallet
                      </button>
                    </div>
          ) : passBalance > 0 ? (
            /* Content Access Area */
            <div>
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f0fdf4', 
                border: '2px solid #22c55e',
                borderRadius: '12px',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#15803d', fontSize: '20px' }}>
                  Welcome to the Experience!
                </h3>
                <p style={{ margin: '0 0 16px 0', color: '#166534' }}>
                  You own {passBalance.toString()} pass{passBalance > 1n ? 'es' : ''} and have access to exclusive content
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  ✅ Access Granted
                </div>
              </div>

              {/* Content Display */}
              <div style={{
                padding: '24px',
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                color: 'white',
                marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#f1f5f9', fontSize: '18px' }}>
                  🔒 Exclusive Experience Content
                </h4>
                
                {/* CID Content */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#334155',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                    Content ID:
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#e2e8f0', wordBreak: 'break-all' }}>
                    {cid}
                  </div>
                </div>

                {/* Demo Content */}
                <div style={{
                  padding: '20px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px'
                }}>
                  <h5 style={{ margin: '0 0 12px 0', color: '#60a5fa' }}>🎯 Experience Preview</h5>
                  <p style={{ margin: '0 0 12px 0', lineHeight: '1.6' }}>
                    This is exclusive content only visible to pass holders! In a real implementation, 
                    this could be:
                  </p>
                  <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li>Video content or streaming access</li>
                    <li>Private community chat or Discord</li>
                    <li>Downloadable files and resources</li>
                    <li>Live event access and perks</li>
                    <li>Interactive experiences and games</li>
                  </ul>
                </div>
                    </div>

              {/* Additional Purchase Option */}
              <div style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h5 style={{ margin: '0 0 12px 0', color: '#475569' }}>Want more passes?</h5>
                <button 
                  onClick={() => setShowContent(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  🛒 Purchase More Passes
                </button>
              </div>
            </div>
          ) : (
                    <div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Quantity:
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
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                      />
                    </div>

              <div style={{ 
                marginBottom: '24px', 
                padding: '20px', 
                backgroundColor: '#f8fafc', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>Cost Breakdown</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Total Cost:</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{formatEther(totalCost)} ETH</span>
                            </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Platform Fee (5%):</span>
                  <span style={{ color: '#6b7280' }}>{formatEther(totalCost * 500n / 10_000n)} ETH</span>
                          </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Proposer Fee (10%):</span>
                  <span style={{ color: '#6b7280' }}>{formatEther(totalCost * 1000n / 10_000n)} ETH</span>
                            </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Creator Amount (85%):</span>
                  <span style={{ color: '#6b7280' }}>{formatEther(totalCost * 8500n / 10_000n)} ETH</span>
                        </div>
                      </div>
                      
                      <button
                onClick={handleBuy}
                disabled={loading || priceEthWei === 0n}
                style={{ 
                  width: '100%',
                  padding: '16px', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  backgroundColor: loading || priceEthWei === 0n ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading || priceEthWei === 0n ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {loading ? '⏳ Processing...' : `🎫 Buy ${qty} Pass${qty > 1 ? 'es' : ''} with ETH`}
                      </button>
                  </div>
                )}
            </div>

        {/* Right Column - Info */}
        <div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              📋 Contract Information
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Experience Contract:</span>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#374151', wordBreak: 'break-all' }}>
                  {experience}
                </div>
                  </div>
                  <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Owner:</span>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#374151', wordBreak: 'break-all' }}>
                  {owner}
                    </div>
                  </div>
                  <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Price per Pass:</span>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                  {formatEther(priceEthWei)} ETH
                </div>
              </div>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Current Proposer:</span>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#374151' }}>
                  {currentProposer || 'None set'}
                  </div>
                  </div>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Content CID:</span>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#374151', wordBreak: 'break-all' }}>
                  {cid}
                </div>
              </div>
              {account && (
                <div>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Your Passes:</span>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: passBalance > 0 ? '#10b981' : '#6b7280' 
                  }}>
                    {passBalance.toString()} pass{passBalance !== 1n ? 'es' : ''}
                    {passBalance > 0 && <span style={{ color: '#10b981', marginLeft: '8px' }}>✅</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              ✨ Pass Features
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
                <span style={{ color: '#374151' }}>Soulbound (Non-transferable)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
                <span style={{ color: '#374151' }}>Permanent Access</span>
                  </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
                <span style={{ color: '#374151' }}>Automated Payment Splits</span>
                  </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
                <span style={{ color: '#374151' }}>Native ETH Payments</span>
                  </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
                <span style={{ color: '#374151' }}>ERC-1155 Standard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* Status Messages */}
      {error && (
        <div style={{ 
          maxWidth: '1200px', 
          margin: '20px auto 0', 
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

      {txHash && (
        <div style={{ 
          maxWidth: '1200px', 
          margin: '20px auto 0', 
          padding: '16px', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          color: '#16a34a', 
          borderRadius: '8px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>✅ Transaction Successful!</div>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Hash:</strong> {txHash}
          </div>
          <a 
            href={`https://sepolia.etherscan.io/tx/${txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#1d4ed8', 
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            🔗 View on Etherscan →
          </a>
        </div>
      )}
    </div>
  );
}