'use client';

import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

const EXPERIENCE_ADDRESS = process.env.NEXT_PUBLIC_EXPERIENCE_ADDRESS || '0x5455558b5ca1E0622d63857d15a7cBcE5eE1322A';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header experienceAddress={EXPERIENCE_ADDRESS} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 animate-fade-in">
                Experience Protocol
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto animate-slide-up">
                Token-gated access with soulbound NFT passes. Secure, transparent, and automated payment splitting for creators.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
                <Link 
                  href={`/experience/${EXPERIENCE_ADDRESS}/buy`}
                  className="btn-primary text-lg px-8 py-4 inline-block"
                >
                  Buy Access Pass
                </Link>
                <Link 
                  href={`/experience/${EXPERIENCE_ADDRESS}/settings`}
                  className="btn-secondary text-lg px-8 py-4 inline-block"
                >
                  View Settings
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Powerful Features
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Built with modern web3 infrastructure and best practices
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="card text-center group hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Token-Gated Access</h3>
                <p className="text-gray-600">
                  Secure access control using ERC-1155 soulbound tokens. Non-transferable passes ensure authentic community membership.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card text-center group hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Payments</h3>
                <p className="text-gray-600">
                  Smart contract automatically splits payments: 85% to creator, 10% to collaborators, 5% platform fee.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card text-center group hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-warning-500 to-warning-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Token Support</h3>
                <p className="text-gray-600">
                  Accept payments in USDC, WETH, DAI and other ERC-20 tokens. Flexible pricing for different payment methods.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Live Network Status
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">Sepolia</div>
                <div className="text-gray-600">Test Network</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success-600 mb-2">Active</div>
                <div className="text-gray-600">Contract Status</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning-600 mb-2">3</div>
                <div className="text-gray-600">Supported Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-error-600 mb-2">5%</div>
                <div className="text-gray-600">Platform Fee</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 text-primary-100 max-w-2xl mx-auto">
              Connect your wallet and buy an access pass to experience the future of token-gated communities.
            </p>
            <Link 
              href={`/experience/${EXPERIENCE_ADDRESS}/buy`}
              className="bg-white text-primary-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-lg transition-colors duration-200 inline-block text-lg"
            >
              Buy Access Pass Now
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}