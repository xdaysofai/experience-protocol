"use client";
import { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import WalletButton from '../../components/WalletButton';
import { publicClient } from '../../lib/viemClient';

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
  createdAt: number;
}

export default function GovernancePage() {
  const { account, wallet, isConnected, isWrongNetwork } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  
  // Create proposal states
  const [showCreateProposal, setShowCreateProposal] = useState<boolean>(false);
  const [newProposal, setNewProposal] = useState({
    experience: '',
    title: '',
    summary: '',
    newCid: ''
  });

  // Load proposals from relayer
  async function loadProposals() {
    try {
      setLoading('Loading proposals...');
      const response = await fetch('http://localhost:4000/proposals');
      if (!response.ok) throw new Error('Failed to load proposals');
      
      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (err: any) {
      console.error('Failed to load proposals:', err);
      setError('Failed to load proposals: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  // Create new proposal
  async function createProposal() {
    if (!account || !newProposal.experience || !newProposal.title || !newProposal.newCid) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading('Creating proposal...');
      const response = await fetch('http://localhost:4000/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: newProposal.experience,
          proposer: account,
          title: newProposal.title,
          summary: newProposal.summary,
          newCid: newProposal.newCid
        })
      });

      if (!response.ok) throw new Error('Failed to create proposal');
      
      await loadProposals();
      setShowCreateProposal(false);
      setNewProposal({ experience: '', title: '', summary: '', newCid: '' });
    } catch (err: any) {
      setError('Failed to create proposal: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  // Vote on proposal
  async function voteOnProposal(proposalId: string, vote: 'up' | 'down') {
    if (!account) {
      setError('Please connect your wallet to vote');
      return;
    }

    try {
      setLoading(`Voting ${vote} on proposal...`);
      const response = await fetch(`http://localhost:4000/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter: account, vote })
      });

      if (!response.ok) throw new Error('Failed to vote');
      
      await loadProposals();
    } catch (err: any) {
      setError('Failed to vote: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  // Accept proposal (creator only)
  async function acceptProposal(proposalId: string) {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading('Accepting proposal...');
      const response = await fetch(`http://localhost:4000/proposals/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to accept proposal');
      
      await loadProposals();
    } catch (err: any) {
      setError('Failed to accept proposal: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  // Check if user can vote (has passes for the experience)
  async function canUserVote(experienceAddress: string): Promise<boolean> {
    if (!account) return false;
    
    try {
      const balance = await publicClient.readContract({
        address: experienceAddress as `0x${string}`,
        abi: [{
          "type": "function",
          "name": "balanceOf",
          "inputs": [
            {"name": "account", "type": "address"},
            {"name": "id", "type": "uint256"}
          ],
          "outputs": [{"name": "", "type": "uint256"}]
        }],
        functionName: 'balanceOf',
        args: [account as `0x${string}`, 1n]
      });
      
      return (balance as bigint) > 0n;
    } catch (err) {
      console.error('Failed to check voting eligibility:', err);
      return false;
    }
  }

  // Check if user is creator of experience
  async function isCreator(experienceAddress: string): Promise<boolean> {
    if (!account) return false;
    
    try {
      const owner = await publicClient.readContract({
        address: experienceAddress as `0x${string}`,
        abi: [{
          "type": "function",
          "name": "owner",
          "inputs": [],
          "outputs": [{"name": "", "type": "address"}]
        }],
        functionName: 'owner'
      });
      
      return (owner as string).toLowerCase() === account.toLowerCase();
    } catch (err) {
      console.error('Failed to check creator status:', err);
      return false;
    }
  }

  useEffect(() => {
    if (isConnected && !isWrongNetwork) {
      loadProposals();
    }
  }, [isConnected, isWrongNetwork]);

  if (!isConnected) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>🗳️ Governance</h1>
        <p style={{ marginBottom: '30px', color: '#6b7280' }}>
          Connect your wallet to participate in community governance
        </p>
        <WalletButton size="lg" />
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>🗳️ Governance</h1>
        <p style={{ marginBottom: '30px', color: '#dc2626' }}>
          Please switch to Sepolia network
        </p>
        <WalletButton size="lg" />
      </div>
    );
  }

  const filteredProposals = proposals.filter(p => p.status === activeTab);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px' }}>🗳️ Governance</h1>
          <p style={{ margin: '0', color: '#6b7280' }}>
            Community proposals and voting for experience updates
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowCreateProposal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ➕ Create Proposal
          </button>
          <WalletButton size="md" />
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0', color: '#4b5563' }}>{loading}</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fca5a5',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0', color: '#dc2626' }}>❌ {error}</p>
        </div>
      )}

      {/* Create Proposal Modal */}
      {showCreateProposal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0' }}>Create New Proposal</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Experience Contract Address *
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={newProposal.experience}
                onChange={(e) => setNewProposal(prev => ({ ...prev, experience: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Proposal Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Update content with new attractions"
                value={newProposal.title}
                onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Proposal Summary
              </label>
              <textarea
                placeholder="Describe what changes you're proposing and why..."
                value={newProposal.summary}
                onChange={(e) => setNewProposal(prev => ({ ...prev, summary: e.target.value }))}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                New Content ID (CID) *
              </label>
              <input
                type="text"
                placeholder="ipfs://Qm..."
                value={newProposal.newCid}
                onChange={(e) => setNewProposal(prev => ({ ...prev, newCid: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={createProposal}
                disabled={!newProposal.experience || !newProposal.title || !newProposal.newCid}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!newProposal.experience || !newProposal.title || !newProposal.newCid) ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: (!newProposal.experience || !newProposal.title || !newProposal.newCid) ? 0.5 : 1
                }}
              >
                Create Proposal
              </button>
              <button
                onClick={() => {
                  setShowCreateProposal(false);
                  setNewProposal({ experience: '', title: '', summary: '', newCid: '' });
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'pending' ? '#f59e0b' : '#f3f4f6',
              color: activeTab === 'pending' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            ⏳ Pending ({proposals.filter(p => p.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'accepted' ? '#059669' : '#f3f4f6',
              color: activeTab === 'accepted' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            ✅ Accepted ({proposals.filter(p => p.status === 'accepted').length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'rejected' ? '#dc2626' : '#f3f4f6',
              color: activeTab === 'rejected' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            ❌ Rejected ({proposals.filter(p => p.status === 'rejected').length})
          </button>
        </div>

        {/* Proposals List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {filteredProposals.length > 0 ? (
            filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onVote={voteOnProposal}
                onAccept={acceptProposal}
                canUserVote={canUserVote}
                isCreator={isCreator}
                userAccount={account}
              />
            ))
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ margin: '0', fontSize: '18px' }}>
                No {activeTab} proposals yet
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                {activeTab === 'pending' ? 'Be the first to create a proposal!' : 
                 activeTab === 'accepted' ? 'No proposals have been accepted yet' :
                 'No proposals have been rejected yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Proposal Card Component
function ProposalCard({ 
  proposal, 
  onVote, 
  onAccept, 
  canUserVote, 
  isCreator, 
  userAccount 
}: {
  proposal: Proposal;
  onVote: (id: string, vote: 'up' | 'down') => void;
  onAccept: (id: string) => void;
  canUserVote: (address: string) => Promise<boolean>;
  isCreator: (address: string) => Promise<boolean>;
  userAccount: string | null;
}) {
  const [canVote, setCanVote] = useState<boolean>(false);
  const [isExpCreator, setIsExpCreator] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  useEffect(() => {
    if (userAccount) {
      canUserVote(proposal.experience).then(setCanVote);
      isCreator(proposal.experience).then(setIsExpCreator);
      setHasVoted(proposal.voters.includes(userAccount));
    }
  }, [proposal, userAccount]);

  const totalVotes = proposal.votesUp + proposal.votesDown;
  const approvalRate = totalVotes > 0 ? (proposal.votesUp / totalVotes) * 100 : 0;

  return (
    <div style={{
      padding: '24px',
      borderBottom: '1px solid #f3f4f6',
      ':last-child': { borderBottom: 'none' }
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1e293b' }}>
            {proposal.title}
          </h3>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
            <span>Experience: {proposal.experience.slice(0, 6)}...{proposal.experience.slice(-4)}</span>
            <span>Proposer: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
            <span>Created: {new Date(proposal.createdAt).toLocaleDateString()}</span>
          </div>
          {proposal.summary && (
            <p style={{ margin: '0 0 12px 0', color: '#4b5563', lineHeight: '1.5' }}>
              {proposal.summary}
            </p>
          )}
          <div style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>New CID:</span>
              <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>
                {proposal.newCid}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
              <span style={{ color: '#059669' }}>👍 {proposal.votesUp} upvotes</span>
              <span style={{ color: '#dc2626' }}>👎 {proposal.votesDown} downvotes</span>
              <span style={{ color: '#6b7280' }}>
                Approval: {approvalRate.toFixed(1)}% ({totalVotes} votes)
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
          {proposal.status === 'pending' && (
            <>
              {canVote && !hasVoted && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onVote(proposal.id, 'up')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    👍 Vote Up
                  </button>
                  <button
                    onClick={() => onVote(proposal.id, 'down')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    👎 Vote Down
                  </button>
                </div>
              )}
              
              {hasVoted && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  ✅ You voted
                </div>
              )}
              
              {isExpCreator && (
                <button
                  onClick={() => onAccept(proposal.id)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ✅ Accept Proposal
                </button>
              )}
              
              {!canVote && !isExpCreator && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#92400e'
                }}>
                  ⚠️ Need passes to vote
                </div>
              )}
            </>
          )}
          
          {proposal.status === 'accepted' && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#15803d',
              fontWeight: '500'
            }}>
              ✅ Accepted
            </div>
          )}
          
          {proposal.status === 'rejected' && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#dc2626',
              fontWeight: '500'
            }}>
              ❌ Rejected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
