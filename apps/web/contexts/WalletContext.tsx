"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import { getInjectedProvider } from '../lib/provider';

interface WalletContextType {
  account: string;
  wallet: ReturnType<typeof createWalletClient> | null;
  isConnected: boolean;
  isWrongNetwork: boolean;
  loading: string;
  error: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string>('');
  const [wallet, setWallet] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');

  const isConnected = Boolean(account);

  async function connectWallet() {
    try {
      setLoading('Connecting...');
      setError('');
      
      const provider = await getInjectedProvider();
      if (!provider) {
        throw new Error('No wallet provider found. Please install MetaMask.');
      }
      
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        const connectedAccount = accounts[0];
        setAccount(connectedAccount);
        
        // Create wallet client
        const walletClient = createWalletClient({ 
          chain: sepolia, 
          transport: custom(provider) 
        });
        setWallet(walletClient);
        
        // Check network
        const chainId = await provider.request({ method: 'eth_chainId' });
        const wrongNetwork = chainId !== '0xaa36a7';
        setIsWrongNetwork(wrongNetwork);
        
        // Store connection state
        localStorage.setItem('wallet_connected', 'true');
        localStorage.setItem('wallet_account', connectedAccount);
        
        console.log('Wallet connected:', connectedAccount);
      }
    } catch (err: any) {
      setError('Failed to connect wallet: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading('');
    }
  }

  async function switchToSepolia() {
    try {
      const provider = await getInjectedProvider();
      if (!provider) return;
      
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
      });
      setIsWrongNetwork(false);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Chain not added to wallet, add it
        try {
          const provider = await getInjectedProvider();
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
          setIsWrongNetwork(false);
        } catch (addError) {
          setError('Failed to add Sepolia network');
        }
      } else {
        setError('Failed to switch to Sepolia network');
      }
    }
  }

  function disconnectWallet() {
    setAccount('');
    setWallet(null);
    setIsWrongNetwork(false);
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_account');
    console.log('Wallet disconnected');
  }

  function clearError() {
    setError('');
  }

  // Auto-reconnect on page load
  useEffect(() => {
    const wasConnected = localStorage.getItem('wallet_connected');
    const lastAccount = localStorage.getItem('wallet_account');
    
    if (wasConnected === 'true' && lastAccount) {
      console.log('Auto-reconnecting wallet...');
      connectWallet();
    }
  }, []);

  // Listen for account/network changes
  useEffect(() => {
    async function handleAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        localStorage.setItem('wallet_account', accounts[0]);
      }
    }

    async function handleChainChanged(chainId: string) {
      setIsWrongNetwork(chainId !== '0xaa36a7');
    }

    async function setupListeners() {
      try {
        const provider = await getInjectedProvider();
        if (provider) {
          provider.on('accountsChanged', handleAccountsChanged);
          provider.on('chainChanged', handleChainChanged);
        }
      } catch (err) {
        console.error('Failed to setup wallet listeners:', err);
      }
    }

    if (isConnected) {
      setupListeners();
    }

    return () => {
      // Cleanup listeners
      getInjectedProvider().then(provider => {
        if (provider) {
          provider.removeListener('accountsChanged', handleAccountsChanged);
          provider.removeListener('chainChanged', handleChainChanged);
        }
      }).catch(() => {});
    };
  }, [isConnected, account]);

  const value: WalletContextType = {
    account,
    wallet,
    isConnected,
    isWrongNetwork,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    clearError,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
