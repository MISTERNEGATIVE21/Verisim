'use client';

import { useIDEStore } from '@/store/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Copy,
  Trash2,
  Info,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function ConsoleOutput() {
  const { simulationResult, isSimulating, setSimulationResult } = useIDEStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [simulationResult]);

  const copyToClipboard = () => {
    if (simulationResult?.output) {
      navigator.clipboard.writeText(simulationResult.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearOutput = () => {
    setSimulationResult(null);
  };

  return (
    <div className="h-full flex flex-col bg-muted/30 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Console Output</span>
          {isSimulating && (
            <span className="text-xs text-amber-500 animate-pulse flex items-center gap-1">
              <span className="animate-spin h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full" />
              Running simulation...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            disabled={!simulationResult?.output}
            className="h-7 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearOutput}
            disabled={!simulationResult}
            className="h-7 text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Output Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4">
          {!simulationResult && !isSimulating && (
            <div className="text-center text-muted-foreground py-8">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Run a simulation to see output here</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Click the "Run Simulation" button above</p>
            </div>
          )}

          {isSimulating && (
            <div className="flex items-center gap-3 text-amber-500 p-4">
              <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full" />
              <div>
                <p className="font-medium">Compiling and running simulation...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
              </div>
            </div>
          )}

          {simulationResult && !isSimulating && (
            <div className="space-y-3">
              {/* Demo Mode Alert */}
              {simulationResult.mock && (
                <Alert className="bg-blue-500/10 border-blue-500/30">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-600 text-sm">Demo Mode Active</AlertTitle>
                  <AlertDescription className="text-xs text-blue-600/80 mt-1">
                    This is a simulated output for demonstration purposes. To run actual Verilog simulations, 
                    install Icarus Verilog on your system.
                    <details className="mt-2">
                      <summary className="cursor-pointer hover:text-blue-600">Installation Instructions</summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto text-foreground">
                        {simulationResult.installationGuide}
                      </pre>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {/* Status */}
              {simulationResult.success ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-3 py-2 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Simulation completed successfully</span>
                </div>
              ) : simulationResult.error ? (
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-2 rounded-md">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{simulationResult.error}</span>
                </div>
              ) : null}

              {/* Output */}
              {simulationResult.output && (
                <pre className="bg-zinc-900 text-green-400 p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed">
                  {simulationResult.output}
                </pre>
              )}

              {/* VCD Info */}
              {simulationResult.vcdContent && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Info className="h-3 w-3" />
                  <span>VCD waveform data generated - use the Waveform panel to visualize</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
