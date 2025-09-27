export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">XP</span>
              </div>
              <span className="text-xl font-bold">Experience Protocol</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Token-gated access protocol with soulbound NFT passes and automated payment splitting.
              Built on Ethereum with modern web3 infrastructure.
            </p>
          </div>

          {/* Network Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Network</h3>
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>Ethereum Sepolia</span>
              </div>
              <p className="text-sm">Chain ID: 11155111</p>
              <p className="text-sm">Testnet Environment</p>
            </div>
          </div>

          {/* Contract Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Smart Contracts</h3>
            <div className="space-y-2">
              <a 
                href="https://sepolia.etherscan.io/address/0x1f84aECc9D2Ba78aAAC7055B7A03b14821bdA2F9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors text-sm block"
              >
                ExperienceFactory ↗
              </a>
              <a 
                href="https://sepolia.etherscan.io/address/0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors text-sm block"
              >
                Experience Contract ↗
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 Experience Protocol. Built with ❤️ for Web3.
          </p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <span className="text-gray-400 text-sm">Powered by</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Ethereum</span>
              <span className="text-gray-500">•</span>
              <span className="text-sm font-medium">Viem</span>
              <span className="text-gray-500">•</span>
              <span className="text-sm font-medium">Next.js</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
