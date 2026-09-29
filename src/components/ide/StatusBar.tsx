'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIDEStore } from '@/store/ide-store';
import { checkToolchainHealth } from '@/lib/tauri-db';
import { Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function StatusBar() {
  const { 
    autoSuggestEnabled, 
    toggleAutoSuggest,
    activeFile,
    isSimulating,
    isPythonRunning,
    toolchainHealth,
    setToolchainHealth,
    toolchainConfig,
    setIsToolchainModalOpen,
    simulationResult,
    synthesisResult,
    pythonResult,
  } = useIDEStore();

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Listen to cursor position changes broadcasted from Monaco editor
  useEffect(() => {
    const handleCursorChange = (e: Event) => {
      const custom = e as CustomEvent<{ line: number; col: number }>;
      if (custom.detail) {
        setCursorPos(custom.detail);
      }
    };
    window.addEventListener('verisim:cursor-change', handleCursorChange);
    return () => window.removeEventListener('verisim:cursor-change', handleCursorChange);
  }, []);

  // Check toolchain health if not yet cached
  useEffect(() => {
    if (!toolchainHealth) {
      checkToolchainHealth(toolchainConfig)
        .then(setToolchainHealth)
        .catch((e) => console.warn('StatusBar health check failed:', e));
    }
  }, [toolchainHealth, toolchainConfig, setToolchainHealth]);

  // Compute live error and warning counts
  const { errorCount, warningCount } = useMemo(() => {
    let errors = 0;
    let warnings = 0;

    if (simulationResult) {
      if (!simulationResult.success) errors++;
      const output = simulationResult.output || '';
      const lines = output.split('\n');
      for (const line of lines) {
        if (/\b(error|ERROR|fatal|FATAL)\b/.test(line)) {
          // If simulation was already marked failed, the first error is accounted for
          errors++;
        } else if (/\b(warning|WARNING)\b/.test(line)) {
          warnings++;
        }
      }
      if (!simulationResult.success && errors > 1) {
        errors -= 1; // avoid double counting the failure flag and the line error
      }
    }

    if (synthesisResult) {
      if (!synthesisResult.success) errors++;
      const output = synthesisResult.output || '';
      const lines = output.split('\n');
      for (const line of lines) {
        if (/\b(ERROR|Error)\b/.test(line)) {
          errors++;
        } else if (/\b(WARNING|Warning)\b/.test(line)) {
          warnings++;
        }
      }
      if (!synthesisResult.success && errors > 1) {
        errors -= 1;
      }
    }

    if (pythonResult && !pythonResult.success) {
      errors++;
    }

    return { errorCount: errors, warningCount: warnings };
  }, [simulationResult, synthesisResult, pythonResult]);

  // Language Mode detection
  const getLanguageMode = () => {
    if (!activeFile) return 'Plain Text';
    if (activeFile.name.endsWith('.sv') || activeFile.name.endsWith('.svh')) return 'SystemVerilog';
    if (activeFile.name.endsWith('.py')) return 'Python';
    return 'Verilog';
  };

  const handleOpenProblems = () => {
    window.dispatchEvent(new CustomEvent('verisim:open-problems'));
  };

  return (
    <footer className="h-6 bg-[#0078d4] text-white flex items-center justify-between px-0 select-none z-20 text-[11px] font-sans overflow-hidden">
      {/* Left items */}
      <div className="flex items-center h-full overflow-x-auto no-scrollbar">
        {/* Remote indicator / Version badge */}
        <div 
          className="h-full px-2.5 bg-[#005a9e] hover:bg-[#004e8c] flex items-center gap-1.5 font-semibold text-white transition-colors cursor-pointer shrink-0"
          title="Verisim EDA Studio v6.1.0"
        >
          <Zap className="h-3 w-3 fill-white" />
          <span>(EDA) Verisim v6.1.0</span>
        </div>

        {/* Error & Warning counters (clickable to open Problems) */}
        <button
          onClick={handleOpenProblems}
          className="h-full px-2 hover:bg-white/15 flex items-center gap-2 transition-colors cursor-pointer text-white shrink-0"
          title={`${errorCount} errors, ${warningCount} warnings - Click to view Problems`}
        >
          <span className="flex items-center gap-1">
            <span className="font-semibold">{errorCount}</span>
            <span className="text-xs">⨂</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold">{warningCount}</span>
            <span className="text-xs">⚠</span>
          </span>
        </button>

        <span className="text-white/30 shrink-0">|</span>

        {/* EDA Toolchain status (clickable to open Toolchain modal) */}
        <button
          onClick={() => setIsToolchainModalOpen(true)}
          className="h-full px-2 hover:bg-white/15 flex items-center gap-2 transition-colors cursor-pointer text-[11px] text-white/95 hover:text-white shrink-0"
          title="Click to view & configure EDA Toolchain"
        >
          <span className="flex items-center gap-1">
            <span>Icarus:</span>
            <strong className={cn("font-medium", toolchainHealth?.iverilog.found ? "text-white" : "text-amber-200")}>
              {toolchainHealth?.iverilog.found ? 'Ready' : 'Missing'}
            </strong>
          </span>
          <span className="text-white/30">|</span>
          <span className="flex items-center gap-1">
            <span>Verilator:</span>
            <strong className={cn("font-medium", toolchainHealth?.verilator.found ? "text-white" : "text-amber-200")}>
              {toolchainHealth?.verilator.found ? 'Ready' : 'Missing'}
            </strong>
          </span>
          <span className="text-white/30">|</span>
          <span className="flex items-center gap-1">
            <span>Yosys:</span>
            <strong className={cn("font-medium", toolchainHealth?.yosys.found ? "text-white" : "text-amber-200")}>
              {toolchainHealth?.yosys.found ? 'Ready' : 'Missing'}
            </strong>
          </span>
        </button>

        {/* Active execution indicator */}
        {isSimulating && (
          <span className="h-full px-2 flex items-center gap-1.5 text-amber-200 animate-pulse font-medium shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Compiling HDL...</span>
          </span>
        )}
        {isPythonRunning && (
          <span className="h-full px-2 flex items-center gap-1.5 text-amber-200 animate-pulse font-medium shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Running Python...</span>
          </span>
        )}
      </div>

      {/* Right items */}
      <div className="flex items-center h-full shrink-0">
        {/* Cursor Position */}
        <span 
          className="h-full px-2.5 flex items-center hover:bg-white/15 cursor-pointer transition-colors"
          title="Line, Column"
        >
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>

        {/* Indentation */}
        <button
          onClick={() => toast.info('Indentation: 2 spaces')}
          className="h-full px-2 hover:bg-white/15 cursor-pointer transition-colors"
          title="Select Indentation"
        >
          Spaces: 2
        </button>

        {/* Encoding */}
        <button
          onClick={() => toast.info('File encoding: UTF-8')}
          className="h-full px-2 hover:bg-white/15 cursor-pointer transition-colors"
          title="Select Encoding"
        >
          UTF-8
        </button>

        {/* Line Endings */}
        <button
          onClick={() => toast.info('End of line sequence: LF (Unix)')}
          className="h-full px-2 hover:bg-white/15 cursor-pointer transition-colors"
          title="Select End of Line Sequence"
        >
          LF
        </button>

        {/* Language Mode */}
        <button
          onClick={() => toast.info(`Language mode: ${getLanguageMode()}`)}
          className="h-full px-2 hover:bg-white/15 cursor-pointer font-medium transition-colors"
          title="Select Language Mode"
        >
          {getLanguageMode()}
        </button>

        {/* Auto-suggest indicator */}
        <button
          onClick={toggleAutoSuggest}
          className="h-full px-2.5 hover:bg-white/15 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          title="Toggle Code Assist (Alt+A)"
        >
          <span>⚡ Code Assist: {autoSuggestEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </footer>
  );
}
