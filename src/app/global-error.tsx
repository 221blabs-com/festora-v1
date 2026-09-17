'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-[var(--fg)] mb-4">
            Something went wrong
          </h2>
          <p className="text-[var(--fg-muted)] mb-6">
            We apologize for the inconvenience. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-light)] transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
