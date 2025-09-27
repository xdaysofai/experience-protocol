"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useWallet } from "../contexts/WalletContext";

type CuratedExperience = {
  address: `0x${string}`;
  name: string;
  summary: string;
  location: string;
  tags: string[];
  priceEth: string;
  category: string;
};

const curatedExperiences: CuratedExperience[] = [
  {
    address: "0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A",
    name: "Top 10 Luxury Hotels • Bali",
    summary: "Hand-picked retreats in Ubud, Seminyak, and beyond with spa perks and private drivers included.",
    location: "Bali, Indonesia",
    tags: ["Luxury", "Wellness"],
    priceEth: "0.08",
    category: "Travel"
  },
  {
    address: "0xBA0182EEfF04A8d7BAA04Afcc4BBCd0ac74Ce88F",
    name: "Barcelona Food Crawl",
    summary: "Tapas, vermouth, and secret dessert spots led by a Michelin-trained local guide.",
    location: "Barcelona, Spain",
    tags: ["Food", "City"],
    priceEth: "0.05",
    category: "Culinary"
  },
  {
    address: "0x0d714837409a2f1D1239a8b2DAF1D3fF326905Af",
    name: "Tokyo Pop-Up Art Trail",
    summary: "A week of underground galleries, interactive exhibits, and after-hours studio visits.",
    location: "Tokyo, Japan",
    tags: ["Art", "Culture"],
    priceEth: "0.07",
    category: "Culture"
  },
  {
    address: "0x64F5EA25D0d4B0bDb4C1D7bF0f6061b5A4E8A02E",
    name: "Remote Work • Lisbon Edition",
    summary: "Coworking passes, beachfront yoga, and weekend surf escapes bundled for digital nomads.",
    location: "Lisbon, Portugal",
    tags: ["Remote Work", "Lifestyle"],
    priceEth: "0.04",
    category: "Lifestyle"
  },
  {
    address: "0x356D1f2C819bAe0B827465fC7229F9E77758A6c9",
    name: "Colorado Adventure Pass",
    summary: "National park permits, gear rentals, and a guided alpine sunrise hike for four friends.",
    location: "Denver, USA",
    tags: ["Outdoors", "Adventure"],
    priceEth: "0.09",
    category: "Adventure"
  }
];

export default function HomePage() {
  const { account, isConnected } = useWallet();
  const locations = useMemo(
    () => Array.from(new Set(curatedExperiences.map((exp) => exp.location))),
    []
  );
  const [activeLocation, setActiveLocation] = useState<string>(locations[0] ?? "");

  const trendingExperiences = useMemo(
    () => curatedExperiences.slice(0, 3),
    []
  );

  const locationExperiences = useMemo(
    () => curatedExperiences.filter((exp) => exp.location === activeLocation),
    [activeLocation]
  );

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
            Token-gated access with soulbound NFT passes and automated payment splitting. 
            Create, sell, and manage exclusive experiences on Ethereum.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/experience">
              <Button size="lg" className="w-full sm:w-auto">
                🔍 Look for Experience
              </Button>
            </Link>
            <Link href="/create">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                🎨 Create Experience
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">85%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Creator Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">5%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Platform Fee</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">10%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Proposer Reward</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Experiences */}
      <section className="mb-16 md:mb-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Trending now</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Fresh experiences the community is booking this week.
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
            <Card key={exp.address} className="flex h-full flex-col bg-white/70 backdrop-blur dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-sm text-primary-600 dark:text-primary-300">
                <span className="font-semibold">{exp.category}</span>
                <span>{exp.priceEth} ETH</span>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
                {exp.name}
              </h3>
              <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300">
                {exp.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                  {exp.location}
                </span>
                {exp.tags.map((tag) => (
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

      {/* Location Explorer */}
      {locations.length > 0 && (
        <section className="mb-16 md:mb-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl md:mb-1 md:text-4xl font-bold">Explore by destination</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Curated city guides and travel passes, ready to mint.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locationExperiences.map((exp) => (
              <Card
                key={`${exp.address}-location`}
                className="flex flex-col border border-white/10 bg-white/60 backdrop-blur dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-300">
                  <span>{exp.category}</span>
                  <span>{exp.priceEth} ETH</span>
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {exp.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {exp.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-200">
                  {exp.tags.map((tag) => (
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
        </section>
      )}

      {/* Features Section */}
      <section className="mb-16 md:mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Experience Protocol?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Built for creators, powered by community, secured by blockchain.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Soulbound Security</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Non-transferable passes protect holders from token drains and ensure authentic access.
            </p>
          </Card>
          
          <Card className="text-center">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Instant Payments</h3>
            <p className="text-gray-600 dark:text-gray-300">
              One-click ETH purchases with automatic revenue splitting to creators and proposers.
            </p>
          </Card>
          
          <Card className="text-center">
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌐</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Community Driven</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Pass-holders vote on proposals and creators accept community-suggested improvements.
            </p>
          </Card>
          
          <Card className="text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Mobile First</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Responsive design optimized for mobile devices with seamless wallet integration.
            </p>
          </Card>
          
          <Card className="text-center">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔗</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Decentralized</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Built on Ethereum with IPFS storage and Lighthouse integration for reliability.
            </p>
          </Card>
          
          <Card className="text-center">
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Creator Focused</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Flexible categories and easy management tools designed for travel and lifestyle creators.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mb-16 md:mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Simple steps to create and monetize your experiences.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
              1
            </div>
            <h3 className="text-lg font-semibold mb-2">Create Experience</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Deploy your experience contract with custom pricing and metadata.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
              2
            </div>
            <h3 className="text-lg font-semibold mb-2">Set Price</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Choose your ETH price and enable/disable sales as needed.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
              3
            </div>
            <h3 className="text-lg font-semibold mb-2">Community Buys</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Users purchase passes with ETH and receive soulbound tokens.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
              4
            </div>
            <h3 className="text-lg font-semibold mb-2">Earn Revenue</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Automatic revenue splitting: 85% creator, 10% proposer, 5% platform.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center">
        <Card className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Join the Experience Protocol and start creating token-gated experiences today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/experience">
                <Button size="lg" className="w-full sm:w-auto">
                  🔍 Look for Experience
                </Button>
              </Link>
              <Link href="/create">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  🎨 Create Experience
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
