"use client";
import { useWallet } from '../contexts/WalletContext';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface WalletButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showFullAddress?: boolean;
  className?: string;
}

export default function WalletButton({ 
  size = 'md', 
  showFullAddress = false, 
  className = '' 
}: WalletButtonProps) {
  const { 
    account, 
    isConnected, 
    isWrongNetwork, 
    loading, 
    connectWallet, 
    disconnectWallet, 
    switchToSepolia 
  } = useWallet();

  if (!isConnected) {
    return (
      <Button
        onClick={connectWallet}
        disabled={loading !== ''}
        size={size}
        className={className}
        loading={loading !== ''}
      >
        Connect Wallet
      </Button>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="warning" size="sm">
          Wrong Network
        </Badge>
        <Button
          onClick={switchToSepolia}
          variant="warning"
          size={size}
          className={className}
        >
          Switch to Sepolia
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
        <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-success-700 dark:text-success-300">
          {showFullAddress ? account : `${account?.slice(0, 6)}...${account?.slice(-4)}`}
        </span>
      </div>
      
      <Button
        onClick={disconnectWallet}
        variant="secondary"
        size={size}
        className={className}
      >
        Disconnect
      </Button>
    </div>
  );
}
