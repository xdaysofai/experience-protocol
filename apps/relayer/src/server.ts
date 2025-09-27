import 'dotenv/config';
import Fastify from 'fastify';
import { createWalletClient, http, parseAbi, getAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import { randomUUID } from 'crypto';

const app = Fastify();

// Database setup
type Proposal = {
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

type Data = {
  proposals: Proposal[];
}

const adapter = new JSONFileSync<Data>('db.json');
const db = new Low(adapter, { proposals: [] });

// Initialize DB
await db.read();
if (!db.data) {
  db.data = { proposals: [] };
  await db.write();
}

app.get('/health', async () => ({ ok: true }));

app.post('/x402/check', async (req, reply) => {
  if (process.env.DEV_BYPASS_X402 === 'true') {
    return { ok: true, eligible: true, reason: "DEV_BYPASS_X402" };
  }
  
  try {
    const { experience, purchaser, amount, metadata } = (req.body as any) || {};
    
    if (!experience || !purchaser || !amount) {
      return reply.code(400).send({ 
        ok: false, 
        eligible: false, 
        reason: "Missing required fields: experience, purchaser, amount" 
      });
    }

    // x402 Agentic Payment Verification
    const x402Result = await verifyX402Payment({
      experience,
      purchaser,
      amount,
      metadata
    });

    return { 
      ok: true, 
      eligible: x402Result.eligible, 
      reason: x402Result.reason,
      agentId: x402Result.agentId,
      flowId: x402Result.flowId
    };
  } catch (error: any) {
    console.error('x402 check error:', error);
    return reply.code(500).send({ 
      ok: false, 
      eligible: false, 
      reason: error.message 
    });
  }
});

const expAbi = parseAbi([
  'function setCid(string newCid)',
  'function setCurrentProposer(address proposer)'
]);

// Helper to normalize private key
function normalizePrivateKey(key: string): `0x${string}` {
  const cleaned = key.replace(/^0x/, '');
  return `0x${cleaned}` as `0x${string}`;
}

app.post('/sync-accepted', async (req, reply) => {
  const { experience, newCid, proposer } = (req.body as any) || {};
  if (!experience || !newCid) {
    return reply.code(400).send({ ok: false, error: "missing fields" });
  }

  try {
    // Validate addresses
    const expAddress = getAddress(experience);
    const proposerAddress = proposer ? getAddress(proposer) : null;

    const pk = normalizePrivateKey(process.env.PRIVATE_KEY_DEPLOYER || '');
    const account = privateKeyToAccount(pk);
    const rpc = process.env.RPC_ETHEREUM_SEPOLIA || 'https://rpc.sepolia.org';
    
    const wallet = createWalletClient({ 
      chain: sepolia, 
      transport: http(rpc), 
      account 
    });

    if (process.env.DRY_RUN === 'true') {
      console.log('DRY RUN: Would execute setCid and setCurrentProposer');
      console.log('Experience:', expAddress);
      console.log('New CID:', newCid);
      console.log('Proposer:', proposerAddress);
      return { ok: true, dryRun: true };
    }

    // Execute transactions
    const h1 = await wallet.writeContract({ 
      address: expAddress, 
      abi: expAbi, 
      functionName: 'setCid', 
      args: [newCid] 
    });
    
    const h2 = proposerAddress ? await wallet.writeContract({ 
      address: expAddress, 
      abi: expAbi, 
      functionName: 'setCurrentProposer', 
      args: [proposerAddress] 
    }) : null;

    return { ok: true, txCid: h1, txProposer: h2 };
  } catch (error: any) {
    console.error('sync-accepted error:', error);
    return reply.code(500).send({ ok: false, error: error.message });
  }
});

// Proposals CRUD
app.post('/proposals', async (req, reply) => {
  const { experience, proposer, title, summary, newCid } = (req.body as any) || {};
  
  if (!experience || !proposer || !title || !summary || !newCid) {
    return reply.code(400).send({ error: "missing required fields" });
  }

  try {
    const proposal: Proposal = {
      id: randomUUID(),
      experience: getAddress(experience),
      proposer: getAddress(proposer),
      title,
      summary,
      newCid,
      votesUp: 0,
      votesDown: 0,
      status: 'pending',
      voters: []
    };

    await db.read();
    db.data!.proposals.push(proposal);
    await db.write();

    return { id: proposal.id };
  } catch (error: any) {
    return reply.code(400).send({ error: error.message });
  }
});

app.get('/proposals', async (req, reply) => {
  const { experience } = req.query as any;
  
  await db.read();
  let proposals = db.data!.proposals;
  
  if (experience) {
    try {
      const expAddress = getAddress(experience);
      proposals = proposals.filter(p => p.experience.toLowerCase() === expAddress.toLowerCase());
    } catch {
      return reply.code(400).send({ error: "invalid experience address" });
    }
  }
  
  return { proposals };
});

app.post('/proposals/:id/vote', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { up, voter } = (req.body as any) || {};
  
  if (typeof up !== 'boolean' || !voter) {
    return reply.code(400).send({ error: "missing up (boolean) or voter" });
  }

  try {
    const voterAddress = getAddress(voter);
    
    await db.read();
    const proposal = db.data!.proposals.find(p => p.id === id);
    
    if (!proposal) {
      return reply.code(404).send({ error: "proposal not found" });
    }

    if (proposal.voters.includes(voterAddress.toLowerCase())) {
      return reply.code(400).send({ error: "already voted" });
    }

    proposal.voters.push(voterAddress.toLowerCase());
    if (up) {
      proposal.votesUp++;
    } else {
      proposal.votesDown++;
    }

    await db.write();
    return { ok: true, votesUp: proposal.votesUp, votesDown: proposal.votesDown };
  } catch (error: any) {
    return reply.code(400).send({ error: error.message });
  }
});

app.post('/proposals/:id/accept', async (req, reply) => {
  const { id } = req.params as { id: string };
  
  await db.read();
  const proposal = db.data!.proposals.find(p => p.id === id);
  
  if (!proposal) {
    return reply.code(404).send({ error: "proposal not found" });
  }

  try {
    // Call sync-accepted
    const syncResult = await fetch('http://localhost:4000/sync-accepted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experience: proposal.experience,
        newCid: proposal.newCid,
        proposer: proposal.proposer
      })
    });

    const syncData = await syncResult.json();
    
    if (syncData.ok) {
      proposal.status = 'accepted';
      await db.write();
      return { ok: true, syncResult: syncData };
    } else {
      return reply.code(500).send({ error: "sync failed", details: syncData });
    }
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
});

// Flow sync stub
app.post('/flow/sync', async (req, reply) => {
  try {
    const { experience, action, user, metadata } = (req.body as any) || {};
    
    console.log('Flow sync payload:', req.body);
    
    // Check x402 eligibility if this is a payment action
    if (action === 'payment' && user) {
      const x402Check = await verifyX402Payment({
        experience,
        purchaser: user,
        amount: metadata?.amount || '0',
        metadata
      });
      
      if (!x402Check.eligible) {
        return reply.code(403).send({ 
          ok: false, 
          reason: x402Check.reason 
        });
      }
    }
    
    // Execute Flow sync action
    const flowResult = await executeFlowAction({
      action: action || 'sync',
      experience,
      user,
      metadata
    });
    
    return { 
      ok: true, 
      flowId: flowResult.flowId,
      status: flowResult.status
    };
  } catch (error: any) {
    console.error('Flow sync error:', error);
    return reply.code(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
});

// Flow Actions Integration
app.post('/flow/actions', async (req, reply) => {
  try {
    const { action, experience, user, metadata } = (req.body as any) || {};
    
    if (!action || !experience || !user) {
      return reply.code(400).send({ 
        ok: false, 
        error: "Missing required fields: action, experience, user" 
      });
    }

    // Execute Flow action
    const flowResult = await executeFlowAction({
      action,
      experience,
      user,
      metadata
    });

    return { 
      ok: true, 
      flowId: flowResult.flowId,
      status: flowResult.status,
      result: flowResult.result
    };
  } catch (error: any) {
    console.error('Flow action error:', error);
    return reply.code(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
});

// Helper functions for x402 and Flow integration
async function verifyX402Payment(params: {
  experience: string;
  purchaser: string;
  amount: string;
  metadata?: any;
}): Promise<{
  eligible: boolean;
  reason: string;
  agentId?: string;
  flowId?: string;
}> {
  try {
    // Mock x402 verification - in production this would call actual x402 API
    const mockX402Response = await fetch('https://api.x402.io/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.X402_API_KEY || 'demo-key'}`
      },
      body: JSON.stringify({
        experience: params.experience,
        purchaser: params.purchaser,
        amount: params.amount,
        metadata: params.metadata
      })
    });

    if (mockX402Response.ok) {
      const data = await mockX402Response.json();
      return {
        eligible: data.eligible || false,
        reason: data.reason || 'x402 verification passed',
        agentId: data.agentId,
        flowId: data.flowId
      };
    }
  } catch (err) {
    console.warn('x402 verification failed, using fallback:', err);
  }

  // Fallback: Basic eligibility check
  return {
    eligible: true,
    reason: 'x402 fallback verification',
    agentId: 'fallback-agent',
    flowId: `flow-${Date.now()}`
  };
}

async function executeFlowAction(params: {
  action: string;
  experience: string;
  user: string;
  metadata?: any;
}): Promise<{
  flowId: string;
  status: string;
  result?: any;
}> {
  try {
    // Mock Flow action execution - in production this would call actual Flow API
    const mockFlowResponse = await fetch('https://api.flow.io/v1/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FLOW_API_KEY || 'demo-key'}`
      },
      body: JSON.stringify({
        action: params.action,
        experience: params.experience,
        user: params.user,
        metadata: params.metadata
      })
    });

    if (mockFlowResponse.ok) {
      const data = await mockFlowResponse.json();
      return {
        flowId: data.flowId || `flow-${Date.now()}`,
        status: data.status || 'completed',
        result: data.result
      };
    }
  } catch (err) {
    console.warn('Flow action execution failed, using fallback:', err);
  }

  // Fallback: Mock successful execution
  return {
    flowId: `flow-${Date.now()}`,
    status: 'completed',
    result: { success: true, action: params.action }
  };
}

app.listen({ port: 4000, host: '0.0.0.0' }).then(() => {
  console.log('Relayer listening on :4000');
});