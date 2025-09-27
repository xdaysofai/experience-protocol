"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";
import ExperienceAbi from "@/abi/Experience.json";
import WalletButton from "@/components/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { fetchExperienceMetadata } from "@/lib/experienceMetadata";
import { resolveAddressIdentity, formatAddress, AddressIdentity } from "@/lib/identity";
import { lighthouseService } from "@/lib/lighthouse";
import { publicClient } from "@/lib/viemClient";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function BuyExperiencePage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const router = useRouter();
  const { account, wallet, isConnected, isWrongNetwork } = useWallet();

  const [priceEthWei, setPriceEthWei] = useState<bigint>(0n);
  const [cid, setCid] = useState<string>("");
  const [currentProposer, setCurrentProposer] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [passBalance, setPassBalance] = useState<bigint>(0n);
  const [experienceName, setExperienceName] = useState<string>("");
  const [experienceSummary, setExperienceSummary] = useState<string>("");
  const [metadataLoading, setMetadataLoading] = useState<boolean>(false);
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(500);
  const [proposerFeeBps, setProposerFeeBps] = useState<number>(1000);
  const [purchaseHash, setPurchaseHash] = useState<string>("");
  const [ownerIdentity, setOwnerIdentity] = useState<AddressIdentity | null>(null);
  const [proposerIdentity, setProposerIdentity] = useState<AddressIdentity | null>(null);

  const salesPaused = priceEthWei === 0n;
  const hasProposer = Boolean(currentProposer && currentProposer !== ZERO_ADDRESS);
  const totalCostWei = priceEthWei * BigInt(qty);
  const platformAmountWei = (totalCostWei * BigInt(platformFeeBps)) / 10_000n;
  const proposerAmountWei = hasProposer
    ? (totalCostWei * BigInt(proposerFeeBps)) / 10_000n
    : 0n;
  const creatorShareBps = Math.max(0, 10_000 - platformFeeBps - proposerFeeBps);
  const creatorAmountWei = totalCostWei - platformAmountWei - proposerAmountWei;

  useEffect(() => {
    loadContractData();
  }, [experience]);

  useEffect(() => {
    if (isConnected && !isWrongNetwork) {
      loadPassBalance();
    }
  }, [isConnected, isWrongNetwork, account, txHash, experience]);

  useEffect(() => {
    if (!account) {
      setPurchaseHash("");
      return;
    }
    const stored = lighthouseService.loadPurchaseHashFromLocalStorage(account);
    if (stored) setPurchaseHash(stored);
  }, [account]);

  useEffect(() => {
    if (!cid) {
      setExperienceName("");
      setExperienceSummary("");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadMetadata() {
      try {
        setMetadataLoading(true);
        const metadata = await fetchExperienceMetadata(cid, controller.signal);
        if (!cancelled && metadata) {
          setExperienceName(metadata.name);
          setExperienceSummary(metadata.description);
        }
      } finally {
        if (!cancelled) setMetadataLoading(false);
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
      if (!hasProposer) {
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
      setLoadingMessage("Fetching experience data...");
      setError("");

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 8000)
      );

      const dataPromise = Promise.all([
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: "priceEthWei",
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: "cid",
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: "currentProposer",
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: "PLATFORM_FEE_BPS",
        }),
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: "proposerFeeBps",
        }),
      ]);

      const [price, cidValue, proposer, ownerValue, platformBps, proposerBps] =
        (await Promise.race([dataPromise, timeout])) as [
          bigint,
          string,
          string,
          string,
          bigint | number,
          bigint | number
        ];

      setPriceEthWei(price);
      setCid(cidValue);
      setCurrentProposer(proposer);
      setOwner(ownerValue);
      setPlatformFeeBps(Number(platformBps));
      setProposerFeeBps(Number(proposerBps));
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Timeout") {
        setError("Network request timed out. Refresh to try again.");
      } else {
        setError("Failed to load experience: " + (err.shortMessage || err.message));
      }
    } finally {
      setLoadingMessage("");
    }
  }

  async function loadPassBalance() {
    if (!account) return;

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );

      const balance = (await Promise.race([
        publicClient.readContract({
          address: experience,
          abi: ExperienceAbi.abi,
          functionName: "balanceOf",
          args: [account as `0x${string}`, 1n],
        }),
        timeout,
      ])) as bigint;

      setPassBalance(balance);
    } catch (err) {
      console.warn("Unable to read pass balance", err);
      setPassBalance(0n);
    }
  }

  async function recordPurchase(txHash: string, quantity: number) {
    if (!account) return;

    try {
      const record = {
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
        record,
        purchaseHash || undefined
      );

      if (newHash) {
        setPurchaseHash(newHash);
        lighthouseService.savePurchaseHashToLocalStorage(account, newHash);
      }
    } catch (err) {
      console.warn("Failed to persist purchase", err);
    }
  }

  async function handleBuy() {
    if (!wallet || !account) {
      setError("Connect your wallet to continue.");
      return;
    }

    if (isWrongNetwork) {
      setError("Switch to the Sepolia network to continue.");
      return;
    }

    try {
      setLoadingMessage("Preparing transaction...");
      setError("");

      const value = priceEthWei * BigInt(qty);
      const { request } = await publicClient.simulateContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: "buyWithEth",
        args: [BigInt(qty)],
        account: account as `0x${string}`,
        value,
      });

      setLoadingMessage("Confirm in your wallet...");
      const hash = await wallet.writeContract(request);
      setTxHash(hash);

      setLoadingMessage("Waiting for confirmation...");
      await publicClient.waitForTransactionReceipt({ hash });
      await recordPurchase(hash, qty);

      setLoadingMessage("Purchase confirmed! Redirecting...");
      setTimeout(() => {
        router.push(`/experience/${experience}`);
      }, 1200);
    } catch (err: any) {
      console.error("Buy failed", err);
      setLoadingMessage("");
      setError("Transaction failed: " + (err.shortMessage || err.message));
    }
  }

  const splitBreakdown = useMemo(
    () => [
      { label: "Creator", value: `${(creatorShareBps / 100).toFixed(2)}%`, amount: creatorAmountWei },
      { label: "Platform", value: `${(platformFeeBps / 100).toFixed(2)}%`, amount: platformAmountWei },
      {
        label: hasProposer ? "Current proposer" : "Proposer",
        value: hasProposer ? `${(proposerFeeBps / 100).toFixed(2)}%` : "—",
        amount: proposerAmountWei,
      },
    ],
    [creatorShareBps, creatorAmountWei, platformFeeBps, platformAmountWei, hasProposer, proposerFeeBps, proposerAmountWei]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-primary-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">XP</span>
            <span className="text-lg font-semibold">Experience Protocol</span>
          </div>
          <WalletButton size="md" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-12">
        <section className="w-full space-y-6 lg:w-2/3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{experience}</p>
                <h1 className="text-2xl font-semibold md:text-3xl">
                  {experienceName || "Access Pass"}
                </h1>
                <p className="text-sm text-slate-300">
                  {metadataLoading
                    ? "Loading experience details..."
                    : experienceSummary || "Token-gated content managed on-chain."}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm text-slate-200">
                <span>
                  Creator: {formatAddress(owner, ownerIdentity)}
                  {ownerIdentity?.verified && (
                    <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                      Verified
                    </span>
                  )}
                </span>
                <span>
                  Current price:
                  <span className="ml-1 text-lg font-semibold text-primary-200">
                    {formatEther(priceEthWei)} ETH
                  </span>
                </span>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-400">
                  {splitBreakdown.map(({ label, value }) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1"
                    >
                      {label}: {value}
                    </span>
                  ))}
                </div>
                {salesPaused && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-200">
                    Sales paused by creator
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold">Purchase</h2>
              <p className="mt-1 text-sm text-slate-300">
                Buy passes for yourself or a team in a single transaction.
              </p>
              <div className="mt-4 space-y-5">
                <label className="block text-sm font-medium text-slate-200">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={qty}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 1;
                      setQty(Math.max(1, Math.min(10, value)));
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-base text-white outline-none ring-primary-500/20 transition focus:border-primary-500/40 focus:ring"
                  />
                </label>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Total cost</span>
                    <span className="text-lg font-semibold text-primary-200">
                      {formatEther(totalCostWei)} ETH
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-400">
                    {splitBreakdown.map(({ label, value, amount }) => (
                      <div className="flex items-center justify-between" key={label}>
                        <span>{label}</span>
                        <span>
                          {value}
                          {totalCostWei > 0n && amount > 0n && (
                            <span className="ml-2 font-semibold text-slate-200">
                              {formatEther(amount)} ETH
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                    <p>{error}</p>
                    {(error.toLowerCase().includes("timeout") || error.toLowerCase().includes("cancel")) && (
                      <button
                        onClick={() => {
                          setError("");
                          loadContractData();
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {txHash && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                    <p className="font-semibold">Transaction submitted</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-emerald-200 underline underline-offset-4"
                    >
                      View on Etherscan
                    </a>
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={
                    loadingMessage.length > 0 || priceEthWei === 0n || !isConnected || salesPaused
                  }
                  className="w-full rounded-2xl bg-primary-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMessage || `Buy ${qty} pass${qty > 1 ? "es" : ""}`}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!isConnected ? (
                <div className="rounded-3xl border border-dashed border-white/20 bg-black/40 p-6 text-center">
                  <p className="text-lg font-semibold">Connect your wallet</p>
                  <p className="mt-2 text-sm text-slate-300">
                    You need a wallet connection to continue.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <WalletButton size="lg" />
                  </div>
                </div>
              ) : isWrongNetwork ? (
                <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-center text-sm text-yellow-100">
                  Switch to Sepolia to complete your purchase.
                </div>
              ) : passBalance > 0n ? (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
                  <p className="text-lg font-semibold">You already own this experience</p>
                  <p className="mt-2">
                    Passes held: {passBalance.toString()} token{passBalance > 1n ? "s" : ""}
                  </p>
                  <button
                    onClick={() => router.push(`/experience/${experience}`)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    View unlocked content
                  </button>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
                  <h2 className="text-lg font-semibold text-white">What you get</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                      Instant soulbound pass minted to your wallet
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                      Multi-quantity checkout in a single transaction
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                      Automatic revenue split written on-chain
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                      Transparent `Bought(buyer, qty, paidWei)` receipt
                    </li>
                  </ul>
                </div>
              )}

              <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-slate-200">
                <h2 className="text-lg font-semibold text-white">Current settings</h2>
                <dl className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Sales status</dt>
                    <dd className="font-medium">
                      {salesPaused ? "Paused" : "Active"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Proposer</dt>
                    <dd className="font-medium">
                      {hasProposer ? formatAddress(currentProposer, proposerIdentity) : "None"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Metadata CID</dt>
                    <dd className="truncate font-mono text-xs text-primary-200" title={cid}>
                      {cid || "Not set"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        <aside className="w-full space-y-4 lg:w-1/3">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-slate-200">
            <h2 className="text-lg font-semibold text-white">Why soulbound?</h2>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                Non-transferable passes keep holders safe from token drains.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                Perfect for curated lists, memberships, and top-contributor rewards.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                On-chain receipts and proposer rewards keep incentives aligned.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-slate-200">
            <h2 className="text-lg font-semibold text-white">Need to update settings?</h2>
            <p className="mt-2 text-sm text-slate-300">
              Manage pricing, proposer, or CID in the owner dashboard.
            </p>
            <button
              onClick={() => router.push(`/experience/${experience}/settings`)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Open settings
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
