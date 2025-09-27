import Link from "next/link";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const EXPERIENCE_ADDRESS = process.env.NEXT_PUBLIC_EXPERIENCE_ADDRESS || '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A';

export default function HomePage() {
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
            <Link href={`/experience/${EXPERIENCE_ADDRESS}/buy`}>
              <Button size="lg" className="w-full sm:w-auto">
                🎫 Buy Access Pass
              </Button>
            </Link>
            <Link href="/creator">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                🎨 Creator Dashboard
              </Button>
            </Link>
            <Link href="/governance">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                🗳️ Governance
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
              <Link href={`/experience/${EXPERIENCE_ADDRESS}/buy`}>
                <Button size="lg" className="w-full sm:w-auto">
                  Buy Access Pass
                </Button>
              </Link>
              <Link href="/creator">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Create Experience
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}