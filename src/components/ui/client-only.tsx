'use client';

import { useSyncExternalStore } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * ClientOnly component prevents hydration mismatches by only rendering
 * children after the component has mounted on the client side.
 */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const hasMounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
