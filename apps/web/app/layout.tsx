import type { Metadata } from 'next';
import './globals.css';
import Image from 'next/image';
import { WalletProvider } from '../contexts/WalletContext';
import SiteHeader from '../components/SiteHeader';

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
            <SiteHeader />

            <main className="flex-1">
              {children}
            </main>

            <footer className="border-t border-gray-200/80 bg-gray-50/80 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/60">
              <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/10">
                        <Image
                          src="/logo_ep.png"
                          alt="Experience Protocol logo"
                          width={30}
                          height={30}
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Experience Protocol
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Token-gated access with soulbound passes, automated revenue sharing, and proposer rewards backed by Ethereum Sepolia.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Platform
                    </h3>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li><a href="/creator" className="transition-colors hover:text-primary-600 dark:hover:text-primary-400">Creator Dashboard</a></li>
                      <li><a href="/governance" className="transition-colors hover:text-primary-600 dark:hover:text-primary-400">Governance</a></li>
                      <li><a href="#" className="transition-colors hover:text-primary-600 dark:hover:text-primary-400">Documentation</a></li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Community
                    </h3>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li><a href="#" className="transition-colors hover:text-primary-600 dark:hover:text-primary-400">Discord</a></li>
                      <li><a href="#" className="transition-colors hover:text-primary-600 dark:hover:text-primary-400">Twitter / X</a></li>
                      <li><a href="#" className="transition-colors hover:text-primary-600 dark:hover:text-primary-400">GitHub</a></li>
                    </ul>
                  </div>
                </div>

                <div className="mt-10 flex flex-col gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                  <p>© 2025 Experience Protocol. Built with ❤️ for on-chain communities.</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-gray-500 dark:text-gray-400">
                    <span>Made for creators, contributors, and their collectives.</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
