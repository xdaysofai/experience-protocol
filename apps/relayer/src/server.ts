import 'dotenv/config';
import Fastify from 'fastify';
import { createWalletClient, http, parseAbi, Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';

const app = Fastify();

app.get('/health', async () => ({ ok: true }));

app.post('/x402/check', async (req, reply) => {
  if (process.env.DEV_BYPASS_X402 === 'true') return { ok: true };
  reply.code(402);
  return { ok: false, reason: "Payment Required" };
});

const expAbi = parseAbi([
  'function setCid(string newCid)',
  'function setCurrentProposer(address proposer)'
]);

app.post('/sync-accepted', async (req, reply) => {
  const { experience, newCid, proposer } = (req.body as any) || {};
  if (!experience || !newCid) return reply.code(400).send({ ok:false, error:"missing fields" });

  const pk = (process.env.PRIVATE_KEY_DEPLOYER || '').replace(/^0x/,'');
  const rpc = process.env.RPC_POLYGON_AMOY || 'https://rpc-amoy.polygon.technology';
  const wallet = createWalletClient({ chain: polygonAmoy, transport: http(rpc), account: `0x${pk}` as Hex });

  // IMPORTANT: in prod, restrict allowed experiences & auth this endpoint.
  const h1 = await wallet.writeContract({ address: experience as Hex, abi: expAbi, functionName: 'setCid', args: [newCid] });
  const h2 = proposer ? await wallet.writeContract({ address: experience as Hex, abi: expAbi, functionName: 'setCurrentProposer', args: [proposer as Hex] }) : null;

  return { ok: true, txSetCid: h1, txSetProposer: h2 };
});

app.listen({ port: 4000, host: '0.0.0.0' }).then(() => {
  console.log('Relayer listening on :4000');
});
