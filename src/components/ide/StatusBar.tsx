'use client';

import { useIDEStore } from '@/store/ide-store';
import { Sparkles, Terminal, Cpu, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { 
    selectedEngine, 
    autoSuggestEnabled, 
    toggleAutoSuggest,
    isAiAssistOpen,
    toggleAiAssist,
    activeFile,
    isSimulating,
    isPythonRunning
  } = useIDEStore();

  const getFileBadge = () => {
    if (!activeFile) return 'No file';
    if (activeFile.name.endsWith('.sv') || activeFile.name.endsWith('.svh')) return 'SystemVerilog (IEEE 1800)';
    if (activeFile.name.endsWith('.py')) return 'Python 3.14';
    return 'Verilog-2001 (IEEE 1364)';
  };

  return (
    <footer className="h-6 bg-card border-t border-border px-3 flex items-center justify-between text-[11px] text-muted-foreground select-none z-20">
      {/* Left items */}
      <div className="flex items-center gap-3">
        {/* Engine status */}
        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <Cpu className="h-3 w-3 text-blue-400" />
          <span>
            HDL: <strong className="text-foreground font-medium">
              {selectedEngine === 'verilator' ? 'Verilator 5.052' : 'Icarus 13.0 (-g2012)'}
            </strong>
          </span>
        </div>

        <span className="text-border/60">|</span>

        {/* Python status */}
        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <span className="text-[10px]">🐍</span>
          <span>Python: <strong className="text-foreground font-medium">3.14 (Verified)</strong></span>
        </div>

        {/* Active execution indicator */}
        {isSimulating && (
          <span className="text-amber-400 animate-pulse font-medium">● Compiling HDL...</span>
        )}
        {isPythonRunning && (
          <span className="text-amber-400 animate-pulse font-medium">● Executing Python...</span>
        )}
      </div>

      {/* Center item */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-muted-foreground">{getFileBadge()}</span>
        {activeFile && (
          <>
            <span className="text-border/60">•</span>
            <span className="font-mono text-[10px] text-foreground">{activeFile.name}</span>
          </>
        )}
      </div>

      {/* Right items */}
      <div className="flex items-center gap-3">
        {/* Auto-suggest toggle */}
        <button
          onClick={toggleAutoSuggest}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[10px] font-medium",
            autoSuggestEnabled 
              ? "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
          title="Toggle Code Suggestions (Alt+A)"
        >
          <span className="text-[10px]">⚡</span>
          <span>Code Assist: {autoSuggestEnabled ? 'ON' : 'OFF'}</span>
        </button>

        <span className="text-border/60">|</span>

        {/* AI Studio trigger */}
        <button
          onClick={toggleAiAssist}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[10px] font-medium",
            isAiAssistOpen 
              ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
          title="Toggle AI Assist Studio"
        >
          <span>HDL Assistant</span>
        </button>
      </div>
    </footer>
  );
}
