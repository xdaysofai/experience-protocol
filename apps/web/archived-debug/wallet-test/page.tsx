import { notFound } from 'next/navigation';
import WalletTestClient from './WalletTestClient';

const isDebugEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_DEBUG_ROUTES === 'true';

export default function WalletTestPage() {
  if (!isDebugEnabled) {
    notFound();
  }

  return <WalletTestClient />;
}
