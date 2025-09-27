"use client";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, parseUnits } from "viem";
import { polygonAmoy } from "viem/chains";

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
  const chain = polygonAmoy;

  const TOKENS = useMemo(() => {
    return [
      { sym: "USDC", addr: process.env.NEXT_PUBLIC_USDC_AMOY as `0x${string}` | undefined },
      { sym: "DAI",  addr: process.env.NEXT_PUBLIC_DAI_AMOY  as `0x${string}` | undefined },
      { sym: "WETH", addr: process.env.NEXT_PUBLIC_WETH_AMOY as `0x${string}` | undefined }
    ].filter(t => !!t.addr) as {sym:string,addr:`0x${string}`}[];
  }, []);

  const [selected, setSelected] = useState<string>(TOKENS[0]?.addr || "");
  const [price, setPrice] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState<number>(18);
  const [qty, setQty] = useState<number>(1);
  const [status, setStatus] = useState<string>("");

  const pub = useMemo(()=> createPublicClient({ chain, transport: http() }), []);
  const [wallet, setWallet] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [account, setAccount] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const w = createWalletClient({ chain, transport: custom((window as any).ethereum) });
      setWallet(w);
      (async () => {
        const [acc] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAccount(acc);
      })();
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!selected) return;
      const allowed = await pub.readContract({ address: exp, abi: expAbi, functionName: "allowedToken", args: [selected as `0x${string}`] });
      const p = await pub.readContract({ address: exp, abi: expAbi, functionName: "priceByToken", args: [selected as `0x${string}`] }) as bigint;
      setPrice(allowed ? p : 0n);
      const dec = await pub.readContract({ address: selected as `0x${string}`, abi: erc20Abi, functionName: "decimals" }) as number;
      setDecimals(dec);
    })();
  }, [selected, exp]);

  const total = price ? price * BigInt(qty) : 0n;

  async function doApproveAndBuy() {
    if (!wallet || !account) return setStatus("Connect wallet");
    if (!selected || !price || price === 0n) return setStatus("Token not allowed or price=0");
    setStatus("Approving...");

    const allowance = await pub.readContract({
      address: selected as `0x${string}`, abi: erc20Abi, functionName: "allowance", args: [account, exp]
    }) as bigint;

    if (allowance < total) {
      const hashA = await wallet.writeContract({
        address: selected as `0x${string}`, abi: erc20Abi, functionName: "approve", args: [exp, total], chain, account
      });
      await pub.waitForTransactionReceipt({ hash: hashA });
    }

    setStatus("Buying...");
    const hashB = await wallet.writeContract({
      address: exp, abi: expAbi, functionName: "buyWithToken", args: [selected as `0x${string}`, BigInt(qty)], chain, account
    });
    await pub.waitForTransactionReceipt({ hash: hashB });
    setStatus("Success! Tx: " + hashB);
  }

  return (
    <main>
      <h2>Buy Access</h2>
      <div><strong>Experience:</strong> {exp}</div>

      <label>Token</label>
      <select value={selected} onChange={e=>setSelected(e.target.value)}>
        {TOKENS.map(t => <option key={t.addr} value={t.addr}>{t.sym} — {t.addr}</option>)}
      </select>

      <label>Quantity</label>
      <input type="number" min={1} value={qty} onChange={e=>setQty(parseInt(e.target.value||"1",10))}/>

      <p>Unit price (raw): {price?.toString() ?? "-"}</p>
      <p>Total (raw): {total.toString()} (decimals {decimals})</p>

      <button onClick={doApproveAndBuy}>Approve → Buy</button>
      <p>{status}</p>
    </main>
  );
}
