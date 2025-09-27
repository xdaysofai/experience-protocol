"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import ExperienceAbi from "@/abi/Experience.json";
import WalletButton from "@/components/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { fetchExperienceMetadata, ExperienceMetadata } from "@/lib/experienceMetadata";
import { resolveAddressIdentity, formatAddress, AddressIdentity } from "@/lib/identity";
import { publicClient } from "@/lib/viemClient";

const PASS_ID = 1n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface ExperienceItem {
  name?: string;
  description?: string;
  category?: string;
  duration?: string;
  priceRange?: string;
  tags?: string[];
}

export default function ExperiencePage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const { account, isConnected, isWrongNetwork } = useWallet();

  const [loadingMessage, setLoadingMessage] = useState<string>("Loading experience...");
  const [error, setError] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [priceEthWei, setPriceEthWei] = useState<bigint>(0n);
  const [cid, setCid] = useState<string>("");
  const [passBalance, setPassBalance] = useState<bigint>(0n);
  const [metadata, setMetadata] = useState<ExperienceMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState<boolean>(false);
  const [currentProposer, setCurrentProposer] = useState<string>("");
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(500);
  const [proposerFeeBps, setProposerFeeBps] = useState<number>(1000);
  const [ownerIdentity, setOwnerIdentity] = useState<AddressIdentity | null>(null);
  const [proposerIdentity, setProposerIdentity] = useState<AddressIdentity | null>(null);

  const experienceName = metadata?.name || "Experience Pass";
  const experienceSummary = metadata?.description || "";
  const hasProposer = Boolean(currentProposer && currentProposer !== ZERO_ADDRESS);
  const creatorShareBps = Math.max(0, 10_000 - platformFeeBps - proposerFeeBps);

  useEffect(() => {
    loadContractData();
  }, [experience]);

  useEffect(() => {
    if (isConnected && !isWrongNetwork) {
      loadPassBalance();
    } else {
      setPassBalance(0n);
    }
  }, [isConnected, isWrongNetwork, account, experience]);

  useEffect(() => {
    if (!cid) {
      setMetadata(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadMetadata() {
      setMetadataLoading(true);
      try {
        const result = await fetchExperienceMetadata(cid, controller.signal);
        if (!cancelled) setMetadata(result);
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
      setLoadingMessage("Loading experience...");
      setError("");

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
    } catch (err: any) {
      console.error("Failed to load experience", err);
      setError(err?.message || "Failed to load experience");
    } finally {
      setLoadingMessage("");
    }
  }

  async function loadPassBalance() {
    if (!account) return;

    try {
      const balance = await publicClient.readContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: "balanceOf",
        args: [account as `0x${string}`, PASS_ID],
      });
      setPassBalance(balance as bigint);
    } catch (err) {
      console.warn("Failed to read balance", err);
      setPassBalance(0n);
    }
  }

  const experienceItems: ExperienceItem[] = useMemo(() => {
    const rawItems = metadata?.raw?.items;
    return Array.isArray(rawItems) ? rawItems : [];
  }, [metadata]);

  const additionalNotes: string | undefined = useMemo(() => {
    const notes = metadata?.raw?.additionalNotes;
    return typeof notes === "string" ? notes : undefined;
  }, [metadata]);

  const overviewCards = [
    { label: "Passes owned", value: passBalance.toString() },
    {
      label: "Creator",
      value: formatAddress(owner, ownerIdentity),
      helper: ownerIdentity?.verified ? "Self-verified" : undefined,
    },
    { label: "Current price", value: `${formatEther(priceEthWei)} ETH` },
    ...(hasProposer
      ? [
          {
            label: "Current proposer",
            value: formatAddress(currentProposer, proposerIdentity),
            helper: `Earning ${(proposerFeeBps / 100).toFixed(2)}% per sale`,
          },
        ]
      : []),
    ...(cid
      ? [
          {
            label: "Content ID",
            value: cid,
            monospace: true,
          },
        ]
      : []),
    {
      label: "Revenue split",
      value: `Creator ${(creatorShareBps / 100).toFixed(2)}%`,
      helper: `Platform ${(platformFeeBps / 100).toFixed(2)}% · Proposer ${(proposerFeeBps / 100).toFixed(2)}%`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-200">Experience</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{experienceName}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {experienceSummary || "Token-gated content curated by the creator."}
            </p>
          </div>
          <WalletButton size="md" />
        </header>

        {loadingMessage && (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {loadingMessage}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            ⚠️ {error}
          </div>
        )}

        {!isConnected ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">Connect your wallet to continue</h2>
            <p className="mt-3 text-sm text-slate-300">
              Passholders unlock the full experience instantly.
            </p>
            <div className="mt-6 flex justify-center">
              <WalletButton size="lg" />
            </div>
          </div>
        ) : isWrongNetwork ? (
          <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center text-yellow-100">
            <h2 className="text-xl font-semibold">Switch to the Sepolia network</h2>
            <p className="mt-2 text-sm">This experience is deployed on Sepolia.</p>
          </div>
        ) : passBalance === 0n ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-2xl font-semibold">Access locked</h2>
            <p className="mt-3 text-sm text-slate-300">
              Purchase a pass to unlock premium content.
            </p>
            <Link
              href={`/experience/${experience}/buy`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-500"
            >
              🎫 Buy access pass
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
              <h2 className="text-xl font-semibold">Experience overview</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {overviewCards.map(({ label, value, helper, monospace }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                    <p
                      className={`mt-2 text-base font-semibold text-white ${monospace ? "font-mono text-xs" : ""}`}
                      title={value}
                    >
                      {value}
                    </p>
                    {helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold">Unlocked content</h2>
                <p className="text-xs text-slate-400">
                  Only passholders can view this content. Keep the CID private.
                </p>
              </div>

              {metadataLoading ? (
                <p className="mt-4 text-sm text-slate-300">Loading content...</p>
              ) : experienceItems.length > 0 ? (
                <div className="mt-5 grid gap-4">
                  {experienceItems.map((item, index) => (
                    <div
                      key={`${item.name || "item"}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/30 p-5"
                    >
                      <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {item.name || `Item ${index + 1}`}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-slate-300">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                          {item.category && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1">
                              {item.category}
                            </span>
                          )}
                          {item.duration && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1">
                              ⏱ {item.duration}
                            </span>
                          )}
                          {item.priceRange && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/40 bg-pink-500/10 px-3 py-1">
                              💵 {item.priceRange}
                            </span>
                          )}
                          {item.tags?.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full border border-purple-400/40 bg-purple-500/10 px-3 py-1"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-300">
                  {experienceSummary || "The creator has not published detailed content yet."}
                </p>
              )}

              {additionalNotes && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-slate-200">
                  <h3 className="text-base font-semibold text-white">Additional notes</h3>
                  <p className="mt-2 text-slate-300">{additionalNotes}</p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold">Need another pass?</h2>
                <p className="text-xs text-slate-400">
                  Purchase additional passes for teammates or collaborators.
                </p>
              </div>
              <Link
                href={`/experience/${experience}/buy`}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500"
              >
                🔁 Buy more passes
              </Link>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
