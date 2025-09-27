import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}