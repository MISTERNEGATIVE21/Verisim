'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Verisim IDE caught error:', error);
  }, [error]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full p-6 border rounded-xl bg-card shadow-lg text-center space-y-4">
        <h2 className="text-xl font-bold">Workspace Notice</h2>
        <p className="text-xs text-muted-foreground">
          {error.message || 'An unexpected issue occurred while rendering the workspace.'}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button size="sm" onClick={() => reset()}>
            Reload View
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Restart Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
