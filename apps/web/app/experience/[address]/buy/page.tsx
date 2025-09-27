"use client";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Loading from '../../../../components/Loading';

const PASS_ID = 1n;

const erc20Abi = [
  { "type":"function","name":"decimals","stateMutability":"view","inputs":[],"outputs":[{"type":"uint8"}]},
  { "type":"function","name":"approve","stateMutability":"nonpayable","inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"type":"bool"}] },
  { "type":"function","name":"allowance","stateMutability":"view","inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"outputs":[{"type":"uint256"}]}
] as const;

const expAbi = [
  { "type":"function","name":"allowedToken","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"bool"}]},
  { "type":"function","name":"priceByToken","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"uint256"}]},
  { "type":"function","name":"buyWithToken","stateMutability":"nonpayable","inputs":[{"type":"address"},{"type":"uint256"}],"outputs":[]},
  { "type":"function","name":"cid","stateMutability":"view","inputs":[],"outputs":[{"type":"string"}]}
] as const;

export default function BuyPage({ params }: { params: { address: `0x${string}` } }) {
  const exp = params.address;
  const chain = sepolia;

  const TOKENS = useMemo(() => {
    return [
      { sym: "USDC", addr: process.env.NEXT_PUBLIC_USDC_SEPOLIA as `0x${string}` | undefined },
      { sym: "DAI",  addr: process.env.NEXT_PUBLIC_DAI_SEPOLIA  as `0x${string}` | undefined },
      { sym: "WETH", addr: process.env.NEXT_PUBLIC_WETH_SEPOLIA as `0x${string}` | undefined }
    ].filter(t => !!t.addr) as {sym:string,addr:`0x${string}`}[];
  }, []);

  const [selected, setSelected] = useState<string>(TOKENS[0]?.addr || "");
  const [price, setPrice] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState<number>(18);
  const [qty, setQty] = useState<number>(1);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);

  const pub = useMemo(()=> createPublicClient({ chain, transport: http() }), []);
  const [wallet, setWallet] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [account, setAccount] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const w = createWalletClient({ chain, transport: custom((window as any).ethereum) });
      setWallet(w);
    }
  }, []);

  async function connectWallet() {
    if (!wallet) return setError("MetaMask not detected");
    try {
      setLoading("Connecting wallet...");
      const [acc] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      setAccount(acc);
      setSuccess("Wallet connected successfully!");
      setError("");
    } catch (error) {
      setError("Failed to connect wallet: " + (error as Error).message);
    } finally {
      setLoading("");
    }
  }

  useEffect(() => {
    (async () => {
      if (!selected) return;
      try {
        const allowed = await pub.readContract({ address: exp, abi: expAbi, functionName: "allowedToken", args: [selected as `0x${string}`] });
        const p = await pub.readContract({ address: exp, abi: expAbi, functionName: "priceByToken", args: [selected as `0x${string}`] }) as bigint;
        setPrice(allowed ? p : 0n);
        try {
          const dec = await pub.readContract({ address: selected as `0x${string}`, abi: erc20Abi, functionName: "decimals" }) as number;
          setDecimals(dec);
        } catch {
          setDecimals(18); // fallback
        }
      } catch (error) {
        setError("Error reading contract: " + (error as Error).message);
        setPrice(0n);
      }
    })();
  }, [selected, exp]);

  const total = price ? price * BigInt(qty) : 0n;

  // Check if approval is needed
  useEffect(() => {
    (async () => {
      if (!wallet || !account || !selected || !price) return;
      try {
        const allowance = await pub.readContract({
          address: selected as `0x${string}`, abi: erc20Abi, functionName: "allowance", args: [account, exp]
        }) as bigint;
        setNeedsApproval(allowance < total);
      } catch (error) {
        console.error("Error checking allowance:", error);
      }
    })();
  }, [wallet, account, selected, price, total]);

  async function approveToken() {
    if (!wallet || !account || !selected) return;
    try {
      setLoading("Approving token...");
      const hashA = await wallet.writeContract({
        address: selected as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [exp, total], chain, account
      });
      await pub.waitForTransactionReceipt({ hash: hashA });
      setSuccess("Token approved successfully!");
      setNeedsApproval(false);
    } catch (error) {
      setError("Failed to approve token: " + (error as Error).message);
    } finally {
      setLoading("");
    }
  }

  async function buyAccess() {
    if (!wallet || !account) return setError("Connect wallet");
    if (!selected || !price || price === 0n) return setError("Token not allowed or price=0");
    
    try {
      setLoading("Purchasing access...");
      const hashB = await wallet.writeContract({
        address: exp, abi: expAbi, functionName: "buyWithToken", args: [selected as `0x${string}`, BigInt(qty)], chain, account
      });
      await pub.waitForTransactionReceipt({ hash: hashB });
      setSuccess("Access purchased successfully! Transaction: " + hashB);
    } catch (error) {
      setError("Failed to purchase access: " + (error as Error).message);
    } finally {
      setLoading("");
    }
  }

  const selectedToken = TOKENS.find(t => t.addr === selected);
  const formattedPrice = price ? formatUnits(price, decimals) : "0";
  const formattedTotal = formatUnits(total, decimals);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header 
        account={account} 
        onConnectWallet={connectWallet} 
        experienceAddress={exp}
      />
      
      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Buy Access Pass</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Purchase a soulbound NFT pass to gain access to this experience. 
              Payments are automatically split between creators and the platform.
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Purchase Form */}
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Purchase Details</h2>

                {!account ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Connect Your Wallet</h3>
                    <p className="text-gray-600 mb-6">Connect your MetaMask wallet to purchase an access pass</p>
                    <button onClick={connectWallet} className="btn-primary">
                      Connect MetaMask Wallet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Token Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Token
                      </label>
                      <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        className="input-field"
                      >
                        {TOKENS.map(t => (
                          <option key={t.addr} value={t.addr}>
                            {t.sym}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={qty}
                        onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                        className="input-field"
                      />
                    </div>

                    {/* Price Info */}
                    {price !== null && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Unit Price:</span>
                            <div className="font-medium text-lg">
                              {formattedPrice} {selectedToken?.sym}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Cost:</span>
                            <div className="font-medium text-lg">
                              {formattedTotal} {selectedToken?.sym}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Approval:</span>
                            <div className={`font-medium ${needsApproval ? 'text-warning-600' : 'text-success-600'}`}>
                              {needsApproval ? 'Required' : 'Approved'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Token Standard:</span>
                            <div className="font-medium">ERC-1155</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {needsApproval && (
                        <button
                          onClick={approveToken}
                          disabled={loading !== ''}
                          className="btn-warning w-full"
                        >
                          Approve {selectedToken?.sym}
                        </button>
                      )}
                      
                      <button
                        onClick={buyAccess}
                        disabled={loading !== '' || !price || price === 0n || needsApproval}
                        className="btn-primary w-full text-lg py-4"
                      >
                        Buy Access Pass ({qty} {qty === 1 ? 'pass' : 'passes'})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Sidebar */}
            <div className="space-y-6">
              {/* Contract Info */}
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Contract Info</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Experience:</span>
                    <div className="font-mono text-xs break-all">{exp}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Network:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                      <span>Ethereum Sepolia</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Token Standard:</span>
                    <div>ERC-1155 (Soulbound)</div>
                  </div>
                </div>
              </div>

              {/* Payment Split */}
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Split</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creator</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Collaborators</span>
                    <span className="font-medium">10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">5%</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pass Features</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Soulbound (Non-transferable)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Permanent Access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Automated Payments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Multi-token Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {status && (
            <div className="mt-6 text-center">
              <p className={`text-sm ${status.includes('Error') ? 'text-error-600' : 'text-gray-600'}`}>
                {status}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
