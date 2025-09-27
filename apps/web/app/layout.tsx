import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '../contexts/WalletContext';
import WalletButton from '../components/WalletButton';

export const metadata: Metadata = {
  title: 'Experience Protocol',
  description: 'Token-gated access with soulbound NFT passes and automated payment splitting',
  keywords: ['web3', 'NFT', 'soulbound', 'token-gated', 'ethereum', 'DeFi'],
  authors: [{ name: 'Experience Protocol Team' }],
  openGraph: {
    title: 'Experience Protocol',
    description: 'Token-gated access with soulbound NFT passes and automated payment splitting',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Experience Protocol',
    description: 'Token-gated access with soulbound NFT passes and automated payment splitting',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-gray-900 dark:text-gray-100 antialiased" suppressHydrationWarning>
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-sticky bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">XP</span>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                      Experience Protocol
                    </span>
                  </div>
                  <nav className="hidden md:flex items-center gap-6">
                    <a href="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      Home
                    </a>
                    <a href="/creator" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      Creator
                    </a>
                    <a href="/governance" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      Governance
                    </a>
                  </nav>
                  <div className="flex items-center gap-3">
                    <WalletButton size="sm" />
                  </div>
                </div>
              </div>
            </header>
            
            <main className="flex-1">
              {children}
            </main>
            
            <footer className="bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
              <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold text-xs">XP</span>
                      </div>
                      <span className="font-semibold">Experience Protocol</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Token-gated access with soulbound NFT passes and automated payment splitting.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4">Platform</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li><a href="/creator" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Creator Dashboard</a></li>
                      <li><a href="/governance" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Governance</a></li>
                      <li><a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Documentation</a></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4">Community</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li><a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Discord</a></li>
                      <li><a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Twitter</a></li>
                      <li><a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">GitHub</a></li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    © 2024 Experience Protocol. Built on Ethereum Sepolia.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}