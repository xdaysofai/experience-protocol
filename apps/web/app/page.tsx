"use client";

import Link from "next/link";
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
    <div className="container mx-auto px-4 py-8 md:py-16">
      {/* Hero Section */}
      <section className="text-center mb-16 md:mb-24">
        <div className="max-w-4xl mx-auto">
          <Badge variant="primary" className="mb-6 animate-fade-in">
            🚀 Now Live on Sepolia
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
            <span className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 bg-clip-text text-transparent">
              Experience Protocol
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Token-gated access with soulbound NFT passes and automated revenue sharing. Build, launch,
            and manage premium experiences without custodial risks or complex tooling.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/experience">
              <Button size="lg" className="w-full sm:w-auto">
                🔍 Explore Experiences
              </Button>
            </Link>
            <Link href="/create">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                🎨 Create New Experience
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">85%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Creator Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">10%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Proposer Reward</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">5%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Platform Fee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Experiences */}
      {!loading && trendingExperiences.length > 0 && (
        <section className="mb-16 md:mb-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Trending now</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Fresh experiences the community has deployed recently.
              </p>
            </div>
            <Link href="/experience" className="self-start">
              <Button variant="secondary" size="sm">
                Browse all experiences
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingExperiences.map((exp) => (
              <Card
                key={exp.address}
                className="flex h-full flex-col bg-white/70 backdrop-blur dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between text-sm text-primary-600 dark:text-primary-300">
                  <span className="font-semibold">
                    {exp.active ? "Active" : "Paused"}
                  </span>
                  <span>{Number(exp.priceEth).toFixed(3)} ETH</span>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
                  {exp.name}
                </h3>
                <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-4">
                  {exp.summary || "Access gated content and rewards."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {exp.location && (
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                      {exp.location}
                    </span>
                  )}
                  {exp.tags.slice(0, 3).map((tag) => (
                    <span
                      key={`${exp.address}-${tag}`}
                      className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-slate-800 dark:text-gray-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/experience/${exp.address}/buy`}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Explore by location</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Curated experiences organized by destination.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => (
                <Button
                  key={location}
                  variant={location === activeLocation ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setActiveLocation(location)}
                  className="whitespace-nowrap"
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
                  className="flex flex-col border border-white/10 bg-white/60 backdrop-blur dark:bg-slate-900/60"
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
        <Card className="bg-white/70 backdrop-blur dark:bg-slate-900/60">
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
        <Card className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to mint your first experience?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
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
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                You can explore without connecting, but buying or creating requires a wallet on Sepolia.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
