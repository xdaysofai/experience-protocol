"use client";
import { useWallet } from '../../contexts/WalletContext';
import { useState, useEffect } from 'react';

export default function WalletTestClient() {
  const { account, wallet, isConnected, isWrongNetwork, loading, error, connectWallet, disconnectWallet } = useWallet();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    addLog(`Wallet state changed: connected=${isConnected}, account=${account || 'none'}, wrongNetwork=${isWrongNetwork}`);
  }, [isConnected, account, isWrongNetwork]);

  useEffect(() => {
    addLog(`Loading state: ${loading || 'none'}`);
  }, [loading]);

  useEffect(() => {
    if (error) addLog(`Error: ${error}`);
  }, [error]);

  const handleConnect = async () => {
    addLog('Attempting to connect wallet...');
    try {
      await connectWallet();
      addLog('Connect wallet call completed');
    } catch (err: any) {
      addLog(`Connect wallet failed: ${err.message}`);
    }
  };

  const handleDisconnect = () => {
    addLog('Disconnecting wallet...');
    disconnectWallet();
    addLog('Wallet disconnected');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Wallet Connection Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>Current State:</h3>
        <div>Connected: {isConnected ? '✅ Yes' : '❌ No'}</div>
        <div>Account: {account || 'None'}</div>
        <div>Wrong Network: {isWrongNetwork ? '⚠️ Yes' : '✅ No'}</div>
        <div>Loading: {loading || 'None'}</div>
        <div>Error: {error || 'None'}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleConnect}
          disabled={loading !== ''}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: isConnected ? '#gray' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isConnected ? 'not-allowed' : 'pointer'
          }}
        >
          {loading || 'Connect Wallet'}
        </button>
        
        <button 
          onClick={handleDisconnect}
          disabled={!isConnected}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: !isConnected ? '#gray' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: !isConnected ? 'not-allowed' : 'pointer'
          }}
        >
          Disconnect Wallet
        </button>

        <button 
          onClick={clearLogs}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Clear Logs
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>LocalStorage:</h3>
        <div>wallet_connected: {typeof window !== 'undefined' ? localStorage.getItem('wallet_connected') || 'null' : 'N/A'}</div>
        <div>wallet_account: {typeof window !== 'undefined' ? localStorage.getItem('wallet_account') || 'null' : 'N/A'}</div>
      </div>

      <div>
        <h3>Event Logs:</h3>
        <div style={{ 
          height: '300px', 
          overflow: 'auto', 
          backgroundColor: '#000', 
          color: '#0f0', 
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          {logs.length === 0 ? 'No logs yet...' : logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
