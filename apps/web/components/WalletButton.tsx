"use client";
import { useWallet } from '../contexts/WalletContext';

interface WalletButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showFullAddress?: boolean;
}

export default function WalletButton({ size = 'md', showFullAddress = false }: WalletButtonProps) {
  const { 
    account, 
    isConnected, 
    isWrongNetwork, 
    loading, 
    connectWallet, 
    disconnectWallet, 
    switchToSepolia 
  } = useWallet();

  const sizeStyles = {
    sm: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '500'
    },
    md: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500'
    },
    lg: {
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600'
    }
  };

  const buttonStyle = sizeStyles[size];

  if (!isConnected) {
    return (
      <button 
        onClick={connectWallet}
        disabled={loading !== ''}
        style={{
          ...buttonStyle,
          backgroundColor: loading !== '' ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading !== '' ? 'not-allowed' : 'pointer'
        }}
      >
        {loading || 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        ...buttonStyle,
        backgroundColor: '#10b981',
        color: 'white',
        borderRadius: '8px'
      }}>
        🟢 {showFullAddress ? account : `${account.slice(0, 6)}...${account.slice(-4)}`}
      </div>
      
      {isWrongNetwork && (
        <button 
          onClick={switchToSepolia}
          style={{
            ...buttonStyle,
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          📡 Switch to Sepolia
        </button>
      )}
      
      <button 
        onClick={disconnectWallet}
        style={{
          ...buttonStyle,
          backgroundColor: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Disconnect
      </button>
    </div>
  );
}
