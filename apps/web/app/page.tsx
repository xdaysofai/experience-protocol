"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useWallet } from "../contexts/WalletContext";
import {
  fetchDiscoverExperiences,
  DiscoverExperience,
} from "../lib/publicExperiences";

export default function HomePage() {
  const { isConnected } = useWallet();
  const [experiences, setExperiences] = useState<DiscoverExperience[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const result = await fetchDiscoverExperiences(12);
        if (!mounted) return;
        setExperiences(result);
        if (result.length > 0) {
          const firstLocation = result.find((exp) => exp.location)?.location;
          setActiveLocation(firstLocation ?? null);
        }
      } catch (err: any) {
        console.error("Home experience load failed", err);
        if (mounted) setError(err?.message || "Unable to load experiences");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const trendingExperiences = useMemo(
    () => experiences.slice(0, 3),
    [experiences]
  );

  const locations = useMemo(() => {
    const unique = new Set<string>();
    experiences.forEach((exp) => {
      if (exp.location) unique.add(exp.location);
    });
    return Array.from(unique);
  }, [experiences]);

  const locationExperiences = useMemo(() => {
    if (!activeLocation) return [];
    return experiences.filter((exp) => exp.location === activeLocation);
  }, [activeLocation, experiences]);

  return (
    <div className="container mx-auto px-4 pb-16 pt-10 sm:pt-12 lg:pt-16">
      {/* Hero Section */}
      <section className="relative mb-16 md:mb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary-100/70 bg-white/80 px-6 py-12 shadow-sm backdrop-blur-xl dark:border-primary-900/30 dark:bg-slate-900/70 sm:px-10 lg:px-16">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-24 top-8 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-800/30" />
            <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-16 translate-y-16 rounded-full bg-primary-400/20 blur-3xl dark:bg-primary-900/40" />
          </div>

          <div className="flex flex-col items-center gap-10 text-center md:flex-row md:items-center md:text-left">
            <div className="flex-1 space-y-6">
              <Badge variant="primary" className="inline-flex items-center gap-2 text-xs uppercase tracking-wide">
                <span className="animate-pulse">🚀</span>
                Now live on Sepolia testnet
              </Badge>

              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
                  Launch premium experiences with soulbound access passes
                </h1>
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                  Experience Protocol gives creators instant ETH payouts, proposer revenue sharing, and a no-rug buyer journey—all in a mobile-first interface.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/experience" className="sm:w-auto">
                  <Button size="lg" className="w-full">
                    🔍 Explore experiences
                  </Button>
                </Link>
                <Link href="/create" className="sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full">
                    🎨 Create new experience
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex w-full flex-col gap-5 rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg backdrop-blur md:max-w-sm dark:border-white/10 dark:bg-slate-900/60">
              <div className="flex items-center gap-3 rounded-2xl border border-primary-200/70 bg-primary-50/70 p-3 text-left dark:border-primary-800/50 dark:bg-primary-900/20">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/10">
                  <Image
                    src="/logo_ep.png"
                    alt="Experience Protocol logo"
                    fill
                    sizes="48px"
                    className="object-contain p-2"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-200">
                    Creator framework
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Soulbound minting, proposer rewards
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <span>Profit split</span>
                <span>Sepolia defaults</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { value: "85%", label: "Creator revenue" },
                  { value: "10%", label: "Proposer reward" },
                  { value: "5%", label: "Platform fee" },
                ].map(({ value, label }) => (
                  <div key={label} className="rounded-xl bg-primary-50/80 p-4 text-center dark:bg-primary-900/20">
                    <div className="text-2xl font-semibold text-primary-700 dark:text-primary-200">
                      {value}
                    </div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-gray-100/80 p-4 text-sm leading-relaxed text-gray-700 dark:bg-slate-800/70 dark:text-gray-200">
                Built-in support for wallet-based access control, mobile checkout, and proposer lifecycle management.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Experiences */}
      {!loading && trendingExperiences.length > 0 && (
        <section className="mb-16 md:mb-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
            <div className="space-y-3">
              <Badge variant="primary" size="sm" className="w-fit">
                🔥 Hot right now
              </Badge>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">Trending experiences</h2>
                <p className="mt-2 text-base text-gray-600 dark:text-gray-300 md:text-lg">
                  Fresh drops curated from the community registry.
                </p>
              </div>
            </div>
            <Link href="/experience" className="md:self-end">
              <Button variant="secondary" size="sm" className="w-full md:w-auto">
                Browse all experiences
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 md:mt-10 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
            {trendingExperiences.map((exp) => (
              <Card
                key={exp.address}
                className="flex h-full min-w-[260px] flex-shrink-0 flex-col bg-white/80 shadow-md backdrop-blur md:min-w-0 dark:bg-slate-900/70"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                  <span>{exp.active ? "Active" : "Paused"}</span>
                  <span>{Number(exp.priceEth).toFixed(3)} ETH</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                  {exp.name}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-3 dark:text-gray-300">
                  {exp.summary || "Access gated content and rewards."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                  {exp.location && (
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                      {exp.location}
                    </span>
                  )}
                  {exp.tags.slice(0, 3).map((tag) => (
                    <span
                      key={`${exp.address}-${tag}`}
                      className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/experience/${exp.address}/buy`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
                >
                  View & buy access
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Explore by location */}
      {!loading && locations.length > 0 && (
        <section className="mb-16 md:mb-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge variant="primary" size="sm" className="w-fit">
                🌍 Location aware
              </Badge>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
                  Explore by location
                </h2>
                <p className="mt-2 text-base text-gray-600 dark:text-gray-300 md:text-lg">
                  Curated experiences organized by destination.
                </p>
              </div>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:pb-0">
              {locations.map((location) => (
                <Button
                  key={location}
                  variant={location === activeLocation ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setActiveLocation(location)}
                  className="whitespace-nowrap rounded-full px-5"
                >
                  {location}
                </Button>
              ))}
            </div>
          </div>
          {locationExperiences.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {locationExperiences.map((exp) => (
                <Card
                  key={`${exp.address}-location`}
                  className="flex flex-col border border-white/20 bg-white/80 shadow-sm backdrop-blur dark:border-white/5 dark:bg-slate-900/70"
                >
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-300">
                    <span>{exp.active ? "Active" : "Paused"}</span>
                    <span>{Number(exp.priceEth).toFixed(3)} ETH</span>
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                    {exp.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-4">
                    {exp.summary || "Token-gated content from this creator."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-200">
                    {exp.tags.slice(0, 4).map((tag) => (
                      <span
                        key={`${exp.address}-${tag}-location`}
                        className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-300">
                      {exp.location}
                    </span>
                    <Link
                      href={`/experience/${exp.address}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition hover:text-primary-500 dark:text-primary-200"
                    >
                      View details →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No experiences yet for this location.
            </p>
          )}
        </section>
      )}

      {loading && (
        <section className="mb-16 md:mb-24">
          <Card className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading experiences from the registry...</p>
          </Card>
        </section>
      )}

      {!loading && experiences.length === 0 && (
        <section className="mb-16 md:mb-24">
          <Card className="text-center">
            <h2 className="text-xl font-semibold mb-2">No experiences published yet</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Be the first to mint an experience contract and invite your community.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/create">
                <Button size="sm">Launch creator flow</Button>
              </Link>
              <Link href="/experience">
                <Button variant="secondary" size="sm">View experience directory</Button>
              </Link>
            </div>
          </Card>
        </section>
      )}

      {error && (
        <section className="mb-16 md:mb-24">
          <Card className="border border-red-500/30 bg-red-500/10 text-red-200">
            <p className="text-sm">{error}</p>
          </Card>
        </section>
      )}

      {/* Quick Start Section */}
      <section className="mb-16 md:mb-24">
        <Card className="bg-gradient-to-br from-white/95 via-primary-50/60 to-white/90 backdrop-blur dark:from-slate-900/80 dark:via-primary-900/20 dark:to-slate-900/70">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h2 className="text-xl font-semibold mb-2">Just getting started?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Deploy your first experience contract in minutes. Bring your own metadata and update content through the relayer flow.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Creators
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>• Deploy via the factory and set your ETH price.</li>
                <li>• Use the settings dashboard to enable/disable sales.</li>
                <li>• Keep CID updates in sync with the relayer.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Buyers & Contributors
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>• One-click ETH checkout, multi-quantity ready.</li>
                <li>• Soulbound passes mint instantly to your wallet.</li>
                <li>• Proposers earn 10% while their CID is active.</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Features Section */}
      <section className="mb-16 md:mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Experience Protocol?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Built for on-chain communities that value trust, transparency, and contributor rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Soulbound Security</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Passes cannot be transferred, approved, or rugged. Access is tied directly to the holder’s wallet.
            </p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Instant Payments</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Zero ERC-20 approvals. Buyers pay in ETH and the split is enforced at purchase time.
            </p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌐</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Community Upgrades</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Proposers submit improved content, earn revenue shares, and sync CID updates via the relayer.
            </p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Mobile-First Experience</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Sleek, responsive UI with lightweight viem clients and window.ethereum only.
            </p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔗</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Composability</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Works with Lighthouse storage, Flow sync hooks, and optional x402 agentic payment checks.
            </p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Creator Focused</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Owner-only controls for pricing, proposer rotation, and revenue management.
            </p>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16 md:mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Four steps to launch a token-gated experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Deploy", copy: "Deploy a new Experience contract via the factory." },
            { step: "02", title: "Configure", copy: "Set price, proposer, and CID via the settings dashboard." },
            { step: "03", title: "Sell", copy: "Share the buy link. Buyers mint soulbound passes instantly." },
            { step: "04", title: "Reward", copy: "Track revenue splits and accept community upgrades." },
          ].map(({ step, title, copy }) => (
            <div key={step} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                {step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center">
        <Card className="relative overflow-hidden border-primary-200 bg-gradient-to-br from-primary-50 via-white to-primary-100 shadow-xl dark:border-primary-800 dark:from-primary-900/40 dark:via-slate-900/60 dark:to-primary-800/30">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
            <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-primary-300 blur-3xl dark:bg-primary-800" />
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm dark:border-white/20 dark:bg-white/10">
                <Image
                  src="/logo_ep.png"
                  alt="Experience Protocol logo"
                  fill
                  sizes="48px"
                  className="object-contain p-2"
                />
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-200">
                Launch on-chain experiences
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">Ready to mint your first experience?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-200">
              Connect a wallet, deploy a contract, and invite your community to participate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/create">
                <Button size="lg" className="w-full sm:w-auto">
                  Launch Creator Flow
                </Button>
              </Link>
              <Link href="/experience">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  View Experience Directory
                </Button>
              </Link>
            </div>
            {!isConnected && (
              <p className="text-sm text-gray-500 dark:text-gray-300">
                You can explore without connecting, but buying or creating requires a wallet on Sepolia.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
