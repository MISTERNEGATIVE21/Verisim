'use client';

import dynamic from 'next/dynamic';

// Dynamically import IDELayout to avoid SSR issues with Monaco Editor
const IDELayout = dynamic(
  () => import('@/components/ide/IDELayout').then(mod => ({ default: mod.IDELayout })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading VerilogSim IDE...</p>
        </div>
      </div>
    )
  }
);

export default function Home() {
  return <IDELayout />;
}
