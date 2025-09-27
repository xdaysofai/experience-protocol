"use client";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Loading from '../../../../components/Loading';

const expAbi = [
  { "type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"type":"address"}]},
  { "type":"function","name":"setTokenPrice","stateMutability":"nonpayable","inputs":[{"type":"address"},{"type":"uint256"},{"type":"bool"}],"outputs":[]},
  { "type":"function","name":"priceByToken","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"uint256"}]},
  { "type":"function","name":"allowedToken","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"bool"}]}
] as const;

const erc20Abi = [
  { "type":"function","name":"decimals","stateMutability":"view","inputs":[],"outputs":[{"type":"uint8"}]},
  { "type":"function","name":"symbol","stateMutability":"view","inputs":[],"outputs":[{"type":"string"}]}
] as const;

interface TokenRow {
  sym: string;
  addr: `0x${string}`;
  allowed: boolean;
  price: string;
  decimals: number;
  originalPrice: string;
  originalAllowed: boolean;
}

export default function SettingsPage({ params }: { params: { address: `0x${string}` } }) {
  const exp = params.address;
  const chain = sepolia;

  const TOKENS = useMemo(() => [
    { sym: "USDC", addr: process.env.NEXT_PUBLIC_USDC_SEPOLIA as `0x${string}` | undefined },
    { sym: "DAI",  addr: process.env.NEXT_PUBLIC_DAI_SEPOLIA  as `0x${string}` | undefined },
    { sym: "WETH", addr: process.env.NEXT_PUBLIC_WETH_SEPOLIA as `0x${string}` | undefined }
  ].filter(t => !!t.addr) as {sym:string,addr:`0x${string}`}[], []);

  const pub = useMemo(()=> createPublicClient({ chain, transport: http() }), []);
  const [wallet, setWallet] = useState<any>(null);
  const [account, setAccount] = useState<`0x${string}` | undefined>();
  const [owner, setOwner] = useState<`0x${string}` | undefined>();
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [savingIndex, setSavingIndex] = useState<number>(-1);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setLoading('Connecting wallet...');
        const w = createWalletClient({ chain, transport: custom((window as any).ethereum) });
        setWallet(w);
        const [acc] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAccount(acc);
        setSuccess('Wallet connected successfully!');
        setError('');
      } catch (err: any) {
        setError('Failed to connect wallet: ' + err.message);
      } finally {
        setLoading('');
      }
    } else {
      setError('MetaMask not found. Please install MetaMask.');
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      connectWallet();
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!account) return;
      try {
        setLoading('Loading contract data...');
        const o = await pub.readContract({ address: exp, abi: expAbi, functionName:"owner" }) as `0x${string}`;
        setOwner(o);
        
        const items: TokenRow[] = [];
        for (const t of TOKENS) {
          try {
            const [allowed, price, decimals, symbol] = await Promise.all([
              pub.readContract({ address: exp, abi: expAbi, functionName:"allowedToken", args:[t.addr] }),
              pub.readContract({ address: exp, abi: expAbi, functionName:"priceByToken", args:[t.addr] }),
              pub.readContract({ address: t.addr, abi: erc20Abi, functionName:"decimals" }),
              pub.readContract({ address: t.addr, abi: erc20Abi, functionName:"symbol" })
            ]);
            
            const priceStr = (price as bigint).toString();
            items.push({ 
              sym: symbol as string, 
              addr: t.addr, 
              allowed: allowed as boolean, 
              price: priceStr,
              decimals: decimals as number,
              originalPrice: priceStr,
              originalAllowed: allowed as boolean
            });
          } catch (err) {
            console.error(`Error loading ${t.sym}:`, err);
            items.push({ 
              sym: t.sym, 
              addr: t.addr, 
              allowed: false, 
              price: "0",
              decimals: 18,
              originalPrice: "0",
              originalAllowed: false
            });
          }
        }
        setRows(items);
      } catch (err: any) {
        setError('Failed to load contract data: ' + err.message);
      } finally {
        setLoading('');
      }
    })();
  }, [exp, account]);

  async function save(rowIdx: number) {
    if (!wallet || !account) return setError('Connect wallet first');
    
    const r = rows[rowIdx];
    try {
      setSavingIndex(rowIdx);
      setLoading(`Saving ${r.sym} settings...`);
      
      const price = BigInt(r.price || "0");
      const hash = await wallet.writeContract({
        address: exp,
        abi: expAbi,
        functionName: "setTokenPrice",
        args: [r.addr, price, r.allowed],
        chain,
        account
      });
      
      await pub.waitForTransactionReceipt({ hash });
      
      // Update original values to reflect saved state
      setRows(prev => prev.map((x, j) => 
        j === rowIdx ? { ...x, originalPrice: x.price, originalAllowed: x.allowed } : x
      ));
      
      setSuccess(`${r.sym} settings saved successfully! Transaction: ${hash}`);
      setError('');
    } catch (err: any) {
      setError(`Failed to save ${r.sym}: ` + err.message);
    } finally {
      setLoading('');
      setSavingIndex(-1);
    }
  }

  function resetRow(rowIdx: number) {
    setRows(prev => prev.map((x, j) => 
      j === rowIdx ? { ...x, price: x.originalPrice, allowed: x.originalAllowed } : x
    ));
  }

  const isOwner = owner && account && owner.toLowerCase() === account.toLowerCase();

  function hasChanges(row: TokenRow): boolean {
    return row.price !== row.originalPrice || row.allowed !== row.originalAllowed;
  }

  function formatPrice(price: string, decimals: number): string {
    try {
      if (price === "0") return "0";
      return formatUnits(BigInt(price), decimals);
    } catch {
      return price;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header 
        account={account} 
        onConnectWallet={connectWallet} 
        experienceAddress={exp}
      />
      
      <main className="flex-1 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Experience Settings</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Configure token pricing and access control for your experience. Only the contract owner can make changes.
            </p>
          </div>

          {/* Status Messages */}
          {loading && (
            <div className="mb-6">
              <Loading text={loading} />
            </div>
          )}
          
          {error && (
            <div className="status-error mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="status-success mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Access Control Notice */}
          <div className={`mb-8 p-6 rounded-lg border ${isOwner ? 'bg-success-50 border-success-200' : 'bg-warning-50 border-warning-200'}`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isOwner ? 'bg-success-500' : 'bg-warning-500'}`}></div>
              <div>
                <h3 className={`font-bold ${isOwner ? 'text-success-800' : 'text-warning-800'}`}>
                  {isOwner ? 'Owner Access' : 'Read-Only Mode'}
                </h3>
                <p className={`text-sm ${isOwner ? 'text-success-700' : 'text-warning-700'}`}>
                  {isOwner 
                    ? 'You have full access to modify contract settings.' 
                    : 'You are not the contract owner. Connect the owner wallet to edit settings.'
                  }
                </p>
                {owner && (
                  <p className={`text-xs font-mono mt-2 ${isOwner ? 'text-success-600' : 'text-warning-600'}`}>
                    Owner: {owner}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Settings Table */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Token Configuration</h2>
            
            {rows.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <p className="text-gray-600">No token data loaded yet...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Token
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Allowed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((r, i) => (
                      <tr key={r.addr} className={hasChanges(r) ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-primary-600 font-bold text-sm">
                                {r.sym.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{r.sym}</div>
                              <div className="text-sm text-gray-500">{r.decimals} decimals</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900 break-all">
                            {r.addr}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              disabled={!isOwner}
                              checked={r.allowed}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setRows(prev => prev.map((x, j) => j === i ? { ...x, allowed: v } : x));
                              }}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <span className={`ml-2 text-sm ${r.allowed ? 'text-success-600' : 'text-gray-500'}`}>
                              {r.allowed ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <input
                              type="text"
                              disabled={!isOwner}
                              value={r.price}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^\d]/g, "");
                                setRows(prev => prev.map((x, j) => j === i ? { ...x, price: v } : x));
                              }}
                              placeholder="Price in wei"
                              className="input-field text-sm"
                            />
                            <div className="text-xs text-gray-500">
                              ≈ {formatPrice(r.price, r.decimals)} {r.sym}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            disabled={!isOwner || savingIndex === i}
                            onClick={() => save(i)}
                            className="btn-primary text-xs py-2 px-3"
                          >
                            {savingIndex === i ? 'Saving...' : 'Save'}
                          </button>
                          {hasChanges(r) && (
                            <button
                              onClick={() => resetRow(i)}
                              className="btn-secondary text-xs py-2 px-3"
                            >
                              Reset
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Contract Info */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contract Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Experience Contract:</span>
                  <div className="font-mono text-xs break-all">{exp}</div>
                </div>
                <div>
                  <span className="text-gray-600">Owner:</span>
                  <div className="font-mono text-xs break-all">{owner || 'Loading...'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Network:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span>Ethereum Sepolia</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Standard:</span>
                  <div>ERC-1155 (Soulbound)</div>
                </div>
              </div>
            </div>

            {/* Settings Help */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Configuration Guide</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-primary-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Allowed:</strong> Enable/disable tokens for payment
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-primary-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Price:</strong> Set price in wei (smallest unit)
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-primary-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Changes:</strong> Rows with changes are highlighted
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-primary-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>Save:</strong> Each token must be saved individually
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}