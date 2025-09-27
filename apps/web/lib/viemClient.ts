import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(DEFAULT_RPC, {
    timeout: 30_000,
    retryCount: 3,
    fetchOptions: {
      cache: 'no-store',
    },
  }),
});
