import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '../contexts/WalletContext';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}