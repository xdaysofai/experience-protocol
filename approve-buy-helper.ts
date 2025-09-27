import { createPublicClient, createWalletClient, custom, http } from "viem";
import { polygonAmoy } from "viem/chains";

const erc20Abi = [
  { "type":"function","name":"approve","stateMutability":"nonpayable","inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"type":"bool"}] },
  { "type":"function","name":"allowance","stateMutability":"view","inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"outputs":[{"type":"uint256"}]}
] as const;

const expAbi = [
  { "type":"function","name":"buyWithToken","stateMutability":"nonpayable","inputs":[{"type":"address"},{"type":"uint256"}],"outputs":[]}
] as const;

export async function approveThenBuy(exp: `0x${string}`, token: `0x${string}`, qty: bigint) {
  const chain = polygonAmoy;
  const pub = createPublicClient({ chain, transport: http() });
  const wallet = createWalletClient({ chain, transport: custom((window as any).ethereum) });

  const [account] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });

  // read price to compute total (optional—you can pass total from UI)
  // const unitPrice = await pub.readContract({ address: exp, abi: expAbi, functionName:"priceByToken", args:[token] });
  // const total = (unitPrice as bigint) * qty;

  // quick path: approve large amount or exact total if known
  const total = 2n ** 255n;

  const allowance = await pub.readContract({ address: token, abi: erc20Abi, functionName:"allowance", args:[account, exp] }) as bigint;
  if (allowance < total) {
    const hA = await wallet.writeContract({ address: token, abi: erc20Abi, functionName:"approve", args:[exp, total] });
    await pub.waitForTransactionReceipt({ hash: hA });
  }

  const hB = await wallet.writeContract({ address: exp, abi: expAbi, functionName:"buyWithToken", args:[token, qty] });
  await pub.waitForTransactionReceipt({ hash: hB });
  return hB;
}
