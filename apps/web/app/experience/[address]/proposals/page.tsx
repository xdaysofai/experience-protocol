"use client";
import { useState, useEffect } from 'react';
import ExperienceAbi from '../../../../abi/Experience.json';
import { getInjectedProvider } from '../../../../lib/provider';
import { publicClient } from '../../../../lib/viemClient';
import { resolveAddressIdentity, formatAddress, AddressIdentity } from '../../../../lib/identity';

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:4000';

interface Proposal {
  id: string;
  experience: string;
  proposer: string;
  title: string;
  summary: string;
  newCid: string;
  votesUp: number;
  votesDown: number;
  status: 'pending' | 'accepted' | 'rejected';
  voters: string[];
}

export default function ProposalsPage({ params }: { params: { address: string } }) {
  const experience = params.address as `0x${string}`;
  const [account, setAccount] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    summary: '',
    newCid: ''
  });
  const [identityMap, setIdentityMap] = useState<Record<string, AddressIdentity>>({});

  const isOwner = account && owner && account.toLowerCase() === owner.toLowerCase();
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const identityFor = (address?: string) => (address ? identityMap[address.toLowerCase()] : undefined);

  useEffect(() => {
    loadOwner();
    loadProposals();
    connectWallet();
  }, [experience]);

  useEffect(() => {
    const addresses = new Set<string>();
    if (owner) addresses.add(owner);
    proposals.forEach((proposal) => {
      if (proposal.proposer) addresses.add(proposal.proposer);
    });

    addresses.forEach((addr) => {
      if (!addr || addr === ZERO_ADDRESS) return;
      const key = addr.toLowerCase();
      if (identityMap[key]) return;

      resolveAddressIdentity(addr).then((identity) => {
        if (!identity) return;
        setIdentityMap((prev) => (prev[key] ? prev : { ...prev, [key]: identity }));
      });
    });
  }, [owner, proposals, identityMap]);

  async function loadOwner() {
    try {
      const ownerData = await publicClient.readContract({
        address: experience,
        abi: ExperienceAbi.abi,
        functionName: 'owner',
      });
      setOwner(ownerData as string);
    } catch (err) {
      console.error('Failed to load owner:', err);
    }
  }

  async function connectWallet() {
    try {
      const provider = await getInjectedProvider();
      const [account] = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(account);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  }

  async function loadProposals() {
    try {
      const response = await fetch(`${RELAYER_URL}/proposals?experience=${experience}`);
      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (err) {
      console.error('Failed to load proposals:', err);
      setError('Failed to load proposals');
    }
  }

  async function createProposal() {
    if (!account || !newProposal.title || !newProposal.summary || !newProposal.newCid) {
      setError('Please fill all fields and connect wallet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${RELAYER_URL}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience,
          proposer: account,
          title: newProposal.title,
          summary: newProposal.summary,
          newCid: newProposal.newCid
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create proposal');
      }

      setNewProposal({ title: '', summary: '', newCid: '' });
      setShowCreateForm(false);
      loadProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  }

  async function vote(proposalId: string, up: boolean) {
    if (!account) {
      setError('Connect wallet to vote');
      return;
    }

    try {
      const response = await fetch(`${RELAYER_URL}/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ up, voter: account })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to vote');
      }

      loadProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to vote');
    }
  }

  async function acceptProposal(proposalId: string) {
    if (!isOwner) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${RELAYER_URL}/proposals/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept proposal');
      }

      loadProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to accept proposal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Proposals for Experience</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <p><strong>Experience:</strong> {experience}</p>
        <p>
          <strong>Owner:</strong>{' '}
          {owner ? <span title={owner}>{formatAddress(owner, identityFor(owner))}</span> : '—'}
        </p>
        <p><strong>Connected:</strong> {account || 'Not connected'}</p>
        <p><strong>Access:</strong> {isOwner ? '✅ Owner (can accept)' : '👁️ Viewer (can vote)'}</p>
      </div>

      {!account && (
        <div style={{ textAlign: 'center', padding: '20px', marginBottom: '20px' }}>
          <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
            Connect Wallet
          </button>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={!account}
          style={{ 
            padding: '10px 20px', 
            fontSize: '14px', 
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: account ? 'pointer' : 'not-allowed'
          }}
        >
          {showCreateForm ? 'Cancel' : 'Create Proposal'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Create New Proposal</h3>
          <div style={{ marginBottom: '15px' }}>
            <label>Title:</label><br />
            <input 
              type="text"
              value={newProposal.title}
              onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Proposal title"
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Summary:</label><br />
            <textarea 
              value={newProposal.summary}
              onChange={(e) => setNewProposal({ ...newProposal, summary: e.target.value })}
              style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
              placeholder="Proposal description"
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>New CID:</label><br />
            <input 
              type="text"
              value={newProposal.newCid}
              onChange={(e) => setNewProposal({ ...newProposal, newCid: e.target.value })}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="ipfs://..."
            />
          </div>
          <button 
            onClick={createProposal}
            disabled={loading}
            style={{ 
              padding: '10px 20px', 
              fontSize: '14px', 
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>
      )}

      <h2>All Proposals ({proposals.length})</h2>
      
      {proposals.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: '#666' }}>No proposals yet</p>
      ) : (
        proposals.map(proposal => (
          <div key={proposal.id} style={{ 
            marginBottom: '20px', 
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            backgroundColor: proposal.status === 'accepted' ? '#f0f8f0' : 
                             proposal.status === 'rejected' ? '#fff0f0' : '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{proposal.title}</h3>
                <p style={{ margin: '0 0 10px 0', color: '#666' }}>{proposal.summary}</p>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>
                  <strong>Proposer:</strong>{' '}
                  <span title={proposal.proposer}>{formatAddress(proposal.proposer, identityFor(proposal.proposer))}</span>
                  {identityFor(proposal.proposer)?.verified && (
                    <span style={{ marginLeft: '6px', color: '#0f766e', fontSize: '12px' }}>✅</span>
                  )}
                  <br />
                  <strong>New CID:</strong> {proposal.newCid}<br />
                  <strong>Status:</strong> <span style={{ 
                    color: proposal.status === 'accepted' ? '#28a745' : 
                           proposal.status === 'rejected' ? '#dc3545' : '#ffc107'
                  }}>{proposal.status.toUpperCase()}</span>
                </p>
              </div>
              
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#28a745' }}>👍 {proposal.votesUp}</span>
                  {' | '}
                  <span style={{ color: '#dc3545' }}>👎 {proposal.votesDown}</span>
                </div>
                
                {account && proposal.status === 'pending' && !proposal.voters.includes(account.toLowerCase()) && (
                  <div style={{ marginBottom: '10px' }}>
                    <button 
                      onClick={() => vote(proposal.id, true)}
                      style={{ 
                        padding: '5px 10px', 
                        marginRight: '5px',
                        fontSize: '12px', 
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      👍
                    </button>
                    <button 
                      onClick={() => vote(proposal.id, false)}
                      style={{ 
                        padding: '5px 10px', 
                        fontSize: '12px', 
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      👎
                    </button>
                  </div>
                )}

                {isOwner && proposal.status === 'pending' && (
                  <button 
                    onClick={() => acceptProposal(proposal.id)}
                    disabled={loading}
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '12px', 
                      backgroundColor: loading ? '#ccc' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Accept
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}
