'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface HeaderProps {
  account?: string;
  onConnectWallet?: () => void;
  experienceAddress?: string;
}

export default function Header({ account, onConnectWallet, experienceAddress }: HeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">XP</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Experience Protocol</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              Home
            </Link>
            {experienceAddress && (
              <>
                <Link 
                  href={`/experience/${experienceAddress}/buy`}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Buy Access
                </Link>
                <Link 
                  href={`/experience/${experienceAddress}/settings`}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Settings
                </Link>
              </>
            )}
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block">
                  <div className="bg-success-50 text-success-700 px-3 py-2 rounded-lg text-sm font-medium">
                    Connected
                  </div>
                </div>
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-sm font-mono text-gray-700">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                className="btn-primary flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
