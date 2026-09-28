'use client';

import { useEffect } from 'react';
import { useIDEStore } from '@/store/ide-store';
import { checkToolchainHealth } from '@/lib/tauri-db';
import { Sparkles, Terminal, Cpu, Layers, Zap } from 'lucide-react';
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
    isPythonRunning,
    toolchainHealth,
    setToolchainHealth,
    toolchainConfig,
    setIsToolchainModalOpen,
  } = useIDEStore();

  useEffect(() => {
    if (!toolchainHealth) {
      checkToolchainHealth(toolchainConfig)
        .then(setToolchainHealth)
        .catch((e) => console.warn('StatusBar health check failed:', e));
    }
  }, [toolchainHealth, toolchainConfig, setToolchainHealth]);

  const getFileBadge = () => {
    if (!activeFile) return 'No file';
    if (activeFile.name.endsWith('.sv') || activeFile.name.endsWith('.svh')) return 'SystemVerilog (IEEE 1800)';
    if (activeFile.name.endsWith('.py')) return 'Python 3.14';
    return 'Verilog-2001 (IEEE 1364)';
  };

  const getHdlStatusLabel = () => {
    if (selectedEngine === 'verilator') {
      if (toolchainHealth?.verilator.found) {
        return toolchainHealth.verilator.version.split('\n')[0].replace('Verilator ', 'Verilator ');
      }
      return 'Verilator (Missing)';
    }
    if (toolchainHealth?.iverilog.found) {
      return 'Icarus 13.0 (-g2012)';
    }
    return 'Icarus Verilog';
  };

  return (
    <footer className="h-6 bg-card border-t border-border px-3 flex items-center justify-between text-[11px] text-muted-foreground select-none z-20">
      {/* Left items */}
      <div className="flex items-center gap-3">
        {/* Engine status (clickable to open toolchain settings) */}
        <button
          onClick={() => setIsToolchainModalOpen(true)}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
          title="Click to view & configure EDA Toolchain"
        >
          <Cpu className={cn(
            "h-3 w-3",
            toolchainHealth?.iverilog.found || toolchainHealth?.verilator.found ? "text-blue-400" : "text-amber-400"
          )} />
          <span>
            HDL: <strong className="text-foreground font-medium">
              {getHdlStatusLabel()}
            </strong>
          </span>
        </button>

        <span className="text-border/60">|</span>

        {/* Yosys Synthesis status */}
        <button
          onClick={() => setIsToolchainModalOpen(true)}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
          title="Click to configure Yosys Synthesis Engine"
        >
          <Zap className={cn("h-3 w-3", toolchainHealth?.yosys.found ? "text-amber-400" : "text-muted-foreground/60")} />
          <span>
            Yosys:{' '}
            <strong className={cn("font-medium", toolchainHealth?.yosys.found ? "text-emerald-400" : "text-amber-400")}>
              {toolchainHealth?.yosys.found ? 'Ready' : 'Not Configured'}
            </strong>
          </span>
        </button>

        <span className="text-border/60">|</span>

        {/* Python status */}
        <button
          onClick={() => setIsToolchainModalOpen(true)}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
          title="Click to configure Python Runtime"
        >
          <span className="text-[10px]">🐍</span>
          <span>
            Python:{' '}
            <strong className="text-foreground font-medium">
              {toolchainHealth?.python.found ? 'Ready (3.14)' : 'Not Found'}
            </strong>
          </span>
        </button>

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
