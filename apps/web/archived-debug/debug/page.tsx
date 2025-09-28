import { notFound } from 'next/navigation';
import DebugPageClient from './DebugPageClient';

const isDebugEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_DEBUG_ROUTES === 'true';

export default function DebugPage() {
  if (!isDebugEnabled) {
    notFound();
  }

  return <DebugPageClient />;
}
