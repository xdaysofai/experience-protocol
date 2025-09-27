"use client";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { polygonAmoy } from "viem/chains";

const expAbi = [
  { "type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"type":"address"}]},
  { "type":"function","name":"setTokenPrice","stateMutability":"nonpayable","inputs":[{"type":"address"},{"type":"uint256"},{"type":"bool"}],"outputs":[]},
  { "type":"function","name":"priceByToken","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"uint256"}]},
  { "type":"function","name":"allowedToken","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"bool"}]}
] as const;

export default function SettingsPage({ params }: { params: { address: `0x${string}` } }) {
  const exp = params.address;
  const chain = polygonAmoy;

  const TOKENS = [
    { sym: "USDC", addr: process.env.NEXT_PUBLIC_USDC_AMOY as `0x${string}` | undefined },
    { sym: "DAI",  addr: process.env.NEXT_PUBLIC_DAI_AMOY  as `0x${string}` | undefined },
    { sym: "WETH", addr: process.env.NEXT_PUBLIC_WETH_AMOY as `0x${string}` | undefined }
  ].filter(t => !!t.addr) as {sym:string,addr:`0x${string}`}[];

  const pub = useMemo(()=> createPublicClient({ chain, transport: http() }), []);
  const [wallet, setWallet] = useState<any>(null);
  const [account, setAccount] = useState<`0x${string}` | undefined>();
  const [owner, setOwner] = useState<`0x${string}` | undefined>();
  const [rows, setRows] = useState<{sym:string,addr:`0x${string}`,allowed:boolean,price:string}[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const w = createWalletClient({ chain, transport: custom((window as any).ethereum) });
      setWallet(w);
      (async () => {
        const [acc] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAccount(acc);
        const o = await pub.readContract({ address: exp, abi: expAbi, functionName:"owner" }) as `0x${string}`;
        setOwner(o);
        const items = [];
        for (const t of TOKENS) {
          const allowed = await pub.readContract({ address: exp, abi: expAbi, functionName:"allowedToken", args:[t.addr] }) as boolean;
          const price = await pub.readContract({ address: exp, abi: expAbi, functionName:"priceByToken", args:[t.addr] }) as bigint;
          items.push({ sym: t.sym, addr: t.addr, allowed, price: price.toString() });
        }
        setRows(items);
      })();
    }
  }, [exp]);

  async function save(rowIdx: number) {
    if (!wallet || !account) return;
    const r = rows[rowIdx];
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
    alert("Saved " + r.sym);
  }

  const isOwner = owner && account && owner.toLowerCase() === account.toLowerCase();

  return (
    <main>
      <h2>Settings ({isOwner ? "Owner" : "Read-only"})</h2>
      {!isOwner && <p>You are not the owner. Connect owner wallet to edit.</p>}
      <table>
        <thead><tr><th>Token</th><th>Address</th><th>Allowed</th><th>Price (raw units)</th><th>Save</th></tr></thead>
        <tbody>
        {rows.map((r,i)=>(
          <tr key={r.addr}>
            <td>{r.sym}</td>
            <td>{r.addr}</td>
            <td>
              <input type="checkbox" disabled={!isOwner}
                     checked={r.allowed}
                     onChange={e=>{
                       const v = e.target.checked;
                       setRows(prev => prev.map((x,j)=> j===i ? {...x, allowed:v} : x));
                     }}/>
            </td>
            <td>
              <input type="text" disabled={!isOwner}
                     value={r.price}
                     onChange={e=>{
                       const v = e.target.value.replace(/[^\d]/g,"");
                       setRows(prev => prev.map((x,j)=> j===i ? {...x, price:v} : x));
                     }}/>
            </td>
            <td><button disabled={!isOwner} onClick={()=>save(i)}>Save</button></td>
          </tr>
        ))}
        </tbody>
      </table>
    </main>
  );
}
