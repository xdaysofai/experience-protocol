"use client";

import { useEffect, useMemo, useState } from "react";
import { createWalletClient, custom, formatEther, parseEther } from "viem";
import { sepolia } from "viem/chains";
import ExperienceAbi from "@/abi/Experience.json";
import { getInjectedProvider } from "@/lib/provider";
import { publicClient } from "@/lib/viemClient";
import { resolveAddressIdentity, formatAddress, AddressIdentity } from "@/lib/identity";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function ExperienceSettingsPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const [account, setAccount] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [priceEthWei, setPriceEthWei] = useState<bigint>(0n);
  const [newPrice, setNewPrice] = useState<string>("");
  const [cid, setCid] = useState<string>("");
  const [currentProposer, setCurrentProposer] = useState<string>("");
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(500);
  const [proposerFeeBps, setProposerFeeBps] = useState<number>(1000);
  const [ownerIdentity, setOwnerIdentity] = useState<AddressIdentity | null>(null);
  const [proposerIdentity, setProposerIdentity] = useState<AddressIdentity | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const isOwner = Boolean(account && owner && account.toLowerCase() === owner.toLowerCase());
  const salesPaused = priceEthWei === 0n;
  const hasProposer = Boolean(currentProposer && currentProposer !== ZERO_ADDRESS);
  const creatorShareBps = useMemo(
    () => Math.max(0, 10_000 - platformFeeBps - proposerFeeBps),
    [platformFeeBps, proposerFeeBps]
  );

  useEffect(() => {
    loadContractData();
    connectWallet();
  }, [experience]);

  useEffect(() => {
    let cancelled = false;
    async function syncOwnerIdentity() {
      if (!owner) {
        setOwnerIdentity(null);
        return;
      }
      const identity = await resolveAddressIdentity(owner);
      if (!cancelled) setOwnerIdentity(identity);
    }
    syncOwnerIdentity();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  useEffect(() => {
    let cancelled = false;
    async function syncProposerIdentity() {
      if (!hasProposer) {
        setProposerIdentity(null);
        return;
      }
      const identity = await resolveAddressIdentity(currentProposer);
      if (!cancelled) setProposerIdentity(identity);
    }
    syncProposerIdentity();
    return () => {
      cancelled = true;
    };
  }, [currentProposer, hasProposer]);

  async function loadContractData() {
    try {
      const [ownerData, priceValue, cidValue, proposer, platformBps, proposerBps] =
        await Promise.all([
          publicClient.readContract({
            address: experience,
            abi: ExperienceAbi.abi,
            functionName: "owner",
          }),
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
            functionName: "PLATFORM_FEE_BPS",
          }),
          publicClient.readContract({
            address: experience,
            abi: ExperienceAbi.abi,
            functionName: "proposerFeeBps",
          }),
        ]);

      setOwner(ownerData as string);
      setPriceEthWei(priceValue as bigint);
      setCid(cidValue as string);
      setCurrentProposer(proposer as string);
      setPlatformFeeBps(Number(platformBps));
      setProposerFeeBps(Number(proposerBps));
      setNewPrice(formatEther(priceValue as bigint));
    } catch (err) {
      console.error("Failed to load contract data", err);
      setError("Failed to load contract data");
    }
  }

  async function connectWallet() {
    try {
      const provider = await getInjectedProvider();
      const [connected] = await provider.request({ method: "eth_requestAccounts" });
      setAccount(connected);
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  }

  async function updatePrice(newPriceEth: string) {
    if (!isOwner) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const provider = await getInjectedProvider();
      const walletClient = createWalletClient({ chain: sepolia, transport: custom(provider) });
      const priceWei = parseEther(newPriceEth || "0");

      const { request } = await publicClient.simulateContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: "setPriceEthWei",
        args: [priceWei],
        account: account as `0x${string}`,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      setPriceEthWei(priceWei);
      setSuccess(priceWei === 0n ? "Sales paused" : `Price set to ${newPriceEth} ETH`);
    } catch (err: any) {
      console.error("Failed to update price", err);
      setError(err.message || "Failed to update price");
    } finally {
      setLoading(false);
    }
  }

  function handleUpdatePrice() {
    updatePrice(newPrice.trim() || "0");
  }

  function handlePauseSales() {
    updatePrice("0");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{experience}</p>
          <h1 className="mt-2 text-3xl font-semibold">Experience settings</h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage pricing for your experience. CID and proposer updates are controlled by the relayer authority.
          </p>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Contract summary</h2>
          <dl className="mt-4 grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">Owner</dt>
              <dd className="mt-1 font-medium" title={owner}>
                {formatAddress(owner, ownerIdentity)}
                {ownerIdentity?.verified && (
                  <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                    Verified
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Connected wallet</dt>
              <dd className="mt-1 font-medium">{account || "Not connected"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Sales status</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                <span className={salesPaused ? "text-yellow-300" : "text-emerald-300"}>
                  {salesPaused ? "Paused" : "Active"}
                </span>
                {priceEthWei > 0n && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                    {formatEther(priceEthWei)} ETH
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Access level</dt>
              <dd className="mt-1 font-medium">{isOwner ? "✅ Owner" : "👁️ Viewer"}</dd>
            </div>
          </dl>

          <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-slate-400">Revenue split</p>
              <ul className="mt-2 space-y-1">
                <li>Creator: {(creatorShareBps / 100).toFixed(2)}%</li>
                <li>Platform: {(platformFeeBps / 100).toFixed(2)}%</li>
                <li>Proposer: {(proposerFeeBps / 100).toFixed(2)}%</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-slate-400">Current proposer</p>
              <p className="mt-2 font-medium">
                {hasProposer ? formatAddress(currentProposer, proposerIdentity) : "None"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Current state</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            <div>
              <span className="text-slate-400">Metadata CID:</span>
              <span className="ml-2 font-mono text-xs text-primary-200" title={cid}>
                {cid || "Not set"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              CID and proposer changes are applied automatically by the relayer.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Price configuration</h2>
          <p className="mt-2 text-sm text-slate-300">
            Set the ETH price to enable sales. Setting the price to 0 pauses sales instantly.
          </p>

          {isOwner ? (
            <div className="mt-5 space-y-5">
              <label className="text-sm font-medium text-slate-200">
                New price (ETH)
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={newPrice}
                  onChange={(event) => setNewPrice(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-base text-white outline-none ring-primary-500/20 transition focus:border-primary-500/40 focus:ring"
                  disabled={loading}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleUpdatePrice}
                  disabled={loading || newPrice.trim() === ""}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Saving..." : salesPaused ? "Resume sales" : "Update price"}
                </button>
                {!salesPaused && (
                  <button
                    onClick={handlePauseSales}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Pause sales"}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Current price: <span className="font-semibold">{formatEther(priceEthWei)} ETH</span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Connect as the owner to modify pricing.</p>
          )}
        </section>

        {!account && (
          <div className="rounded-3xl border border-dashed border-white/20 bg-black/40 p-6 text-center text-sm text-slate-300">
            Connect a wallet to manage settings.
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
