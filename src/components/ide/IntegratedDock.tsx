'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIDEStore, DockTab, VerilogFile } from '@/store/ide-store';
import { ConsoleOutput } from './ConsoleOutput';
import { PythonOutput } from './PythonOutput';
import { WaveformViewer } from './WaveformViewer';
import { SynthesisViewer } from './SynthesisViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Terminal,
  Columns2, 
  Activity, 
  Maximize2, 
  Minimize2, 
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Zap,
  X,
  WrapText,
  Search,
  FileCode2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ActivePanel = 'problems' | 'console' | 'synth' | 'python' | 'waveform';

interface DiagnosticProblem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  file?: string;
  line?: number;
  col?: number;
}

export function IntegratedDock() {
  const { 
    activeDockTab, 
    setActiveDockTab, 
    dockCollapsed, 
    setDockCollapsed,
    dockMaximized,
    setDockMaximized,
    isSimulating,
    simulationResult,
    isPythonRunning,
    pythonResult,
    synthesisResult,
    isSynthesizing,
    setSimulationResult,
    setPythonResult,
    setSynthesisResult,
    waveformLayout,
    toggleWaveformLayout,
    currentProject,
    openFile,
    setActiveFile,
    selectedEngine,
  } = useIDEStore();

  const [activePanel, setActivePanel] = useState<ActivePanel>('console');
  const [wordWrap, setWordWrap] = useState(true);
  const [problemsFilter, setProblemsFilter] = useState('');

  // Sync active panel with store activeDockTab
  useEffect(() => {
    if (activeDockTab) {
      setActivePanel(activeDockTab);
    }
  }, [activeDockTab]);

  // Listen to external request to open Problems tab
  useEffect(() => {
    const handleOpenProblems = () => {
      setActivePanel('problems');
      setDockCollapsed(false);
    };
    window.addEventListener('verisim:open-problems', handleOpenProblems);
    return () => window.removeEventListener('verisim:open-problems', handleOpenProblems);
  }, [setDockCollapsed]);

  // Extract structured problems/diagnostics from compilation & synthesis results
  const problems = useMemo<DiagnosticProblem[]>(() => {
    const list: DiagnosticProblem[] = [];

    // 1. Diagnostics from Simulation (Icarus / Verilator)
    if (simulationResult) {
      const output = simulationResult.output || '';
      const lines = output.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Matches: filename:line: error/warning: message OR filename:line:col: error/warning: message
        const match = line.match(/^([^:\s]+):(\d+):(?:\s*(\d+):)?\s*(?:(error|warning|fatal|info):\s*)?(.*)$/i);
        if (match) {
          const rawSeverity = (match[4] || '').toLowerCase();
          const severity: 'error' | 'warning' | 'info' = 
            rawSeverity.includes('warn') ? 'warning' : 'error';
          const fileName = match[1];
          const lineNum = parseInt(match[2], 10);
          const colNum = match[3] ? parseInt(match[3], 10) : undefined;
          const message = match[5] || line;

          list.push({
            id: `sim-${i}`,
            severity,
            message,
            source: selectedEngine === 'verilator' ? 'Verilator' : 'Icarus Verilog',
            file: fileName,
            line: lineNum,
            col: colNum,
          });
        }
      }

      // If simulation failed but no specific line error was parsed
      if (!simulationResult.success && list.length === 0) {
        list.push({
          id: 'sim-failed-general',
          severity: 'error',
          message: simulationResult.error || simulationResult.message || 'Simulation execution failed.',
          source: selectedEngine === 'verilator' ? 'Verilator' : 'Icarus Verilog',
          file: currentProject?.files?.[0]?.name,
        });
      }
    }

    // 2. Diagnostics from Yosys Synthesis
    if (synthesisResult) {
      if (!synthesisResult.success) {
        list.push({
          id: 'synth-failed',
          severity: 'error',
          message: synthesisResult.error || 'Synthesis error encountered in Yosys.',
          source: 'Yosys Synthesis',
          file: synthesisResult.top_module ? `${synthesisResult.top_module}.v` : undefined,
        });
      }

      const out = synthesisResult.output || '';
      const synthLines = out.split('\n');
      for (let i = 0; i < synthLines.length; i++) {
        const line = synthLines[i].trim();
        if (line.startsWith('ERROR:') || line.startsWith('Error:')) {
          list.push({
            id: `synth-err-${i}`,
            severity: 'error',
            message: line.replace(/^ERROR:\s*/i, ''),
            source: 'Yosys RTL',
          });
        } else if (line.startsWith('Warning:') || line.startsWith('WARNING:')) {
          list.push({
            id: `synth-warn-${i}`,
            severity: 'warning',
            message: line.replace(/^WARNING:\s*/i, ''),
            source: 'Yosys RTL',
          });
        }
      }
    }

    // 3. Diagnostics from Python Verification
    if (pythonResult && !pythonResult.success) {
      list.push({
        id: 'python-error',
        severity: 'error',
        message: pythonResult.output.split('\n').filter(Boolean).pop() || 'Python verification execution failed',
        source: 'Python Runner',
      });
    }

    return list;
  }, [simulationResult, synthesisResult, pythonResult, selectedEngine, currentProject]);

  const filteredProblems = useMemo(() => {
    if (!problemsFilter.trim()) return problems;
    const q = problemsFilter.toLowerCase();
    return problems.filter(p => 
      p.message.toLowerCase().includes(q) || 
      p.source.toLowerCase().includes(q) || 
      (p.file && p.file.toLowerCase().includes(q))
    );
  }, [problems, problemsFilter]);

  const problemCount = problems.length;
  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;

  const handleSelectTab = (tabId: ActivePanel) => {
    setActivePanel(tabId);
    setDockCollapsed(false);
    if (tabId === 'console' || tabId === 'synth' || tabId === 'python' || tabId === 'waveform') {
      setActiveDockTab(tabId);
    }
  };

  const handleClearActive = () => {
    if (activePanel === 'console' || activePanel === 'problems') {
      setSimulationResult(null);
      toast.info('Output cleared');
    } else if (activePanel === 'python') {
      setPythonResult(null);
      toast.info('Python output cleared');
    } else if (activePanel === 'synth') {
      setSynthesisResult(null);
      toast.info('Synthesis output cleared');
    }
  };

  const toggleWordWrap = () => {
    const next = !wordWrap;
    setWordWrap(next);
    toast.info(next ? 'Word Wrap: ON' : 'Word Wrap: OFF');
    window.dispatchEvent(new CustomEvent('verisim:word-wrap', { detail: { wordWrap: next } }));
  };

  const handleJumpToProblem = (problem: DiagnosticProblem) => {
    if (!problem.file) return;

    // Find file in project
    const targetFile = currentProject?.files.find(f => 
      f.name === problem.file || f.name.endsWith(`/${problem.file}`) || problem.file?.endsWith(f.name)
    );

    if (targetFile) {
      openFile(targetFile);
      setActiveFile(targetFile);
    }

    if (problem.line) {
      window.dispatchEvent(new CustomEvent('verisim:jump-to-line', {
        detail: { line: problem.line }
      }));
    }
  };

  const hasVCD = Boolean(simulationResult?.vcdContent);
  const totalGates = synthesisResult?.cell_counts 
    ? Object.values(synthesisResult.cell_counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className={cn(
      "flex flex-col bg-background border-t border-[#252526] transition-all duration-200 overflow-hidden",
      dockCollapsed ? "h-9" : "h-full"
    )}>
      {/* VSCodium Style Bottom Panel Header */}
      <div className="h-9 px-2 flex items-center justify-between bg-[#181818] border-b border-[#252526] select-none shrink-0">
        {/* Left Tabs */}
        <div className="flex items-center h-full overflow-x-auto no-scrollbar">
          {/* Tab: PROBLEMS */}
          <button
            onClick={() => handleSelectTab('problems')}
            className={cn(
              "h-full px-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors border-b-2 cursor-pointer shrink-0",
              activePanel === 'problems' && !dockCollapsed
                ? "text-white border-[#0078d4]"
                : "text-[#969696] border-transparent hover:text-[#cccccc] hover:bg-white/5"
            )}
          >
            <span>PROBLEMS</span>
            {errorCount > 0 ? (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {problemCount}
              </span>
            ) : warningCount > 0 ? (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {warningCount}
              </span>
            ) : (
              <span className="ml-0.5 text-[10px] text-muted-foreground/60">0</span>
            )}
          </button>

          {/* Tab: OUTPUT */}
          <button
            onClick={() => handleSelectTab('console')}
            className={cn(
              "h-full px-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors border-b-2 cursor-pointer shrink-0",
              activePanel === 'console' && !dockCollapsed
                ? "text-white border-[#0078d4]"
                : "text-[#969696] border-transparent hover:text-[#cccccc] hover:bg-white/5"
            )}
          >
            <span>OUTPUT</span>
            {isSimulating ? (
              <Loader2 className="h-3 w-3 animate-spin text-blue-400 ml-0.5" />
            ) : simulationResult ? (
              simulationResult.success ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" title="Simulation passed" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ml-0.5" title="Simulation diagnostics" />
              )
            ) : null}
          </button>

          {/* Tab: SYNTHESIS */}
          <button
            onClick={() => handleSelectTab('synth')}
            className={cn(
              "h-full px-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors border-b-2 cursor-pointer shrink-0",
              activePanel === 'synth' && !dockCollapsed
                ? "text-white border-[#0078d4]"
                : "text-[#969696] border-transparent hover:text-[#cccccc] hover:bg-white/5"
            )}
          >
            <span>SYNTHESIS</span>
            {isSynthesizing ? (
              <Loader2 className="h-3 w-3 animate-spin text-violet-400 ml-0.5" />
            ) : synthesisResult ? (
              synthesisResult.success ? (
                <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded border border-violet-500/30 ml-0.5">
                  {totalGates} Gates
                </span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ml-0.5" title="Synthesis failed" />
              )
            ) : null}
          </button>

          {/* Tab: TERMINAL */}
          <button
            onClick={() => handleSelectTab('python')}
            className={cn(
              "h-full px-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors border-b-2 cursor-pointer shrink-0",
              activePanel === 'python' && !dockCollapsed
                ? "text-white border-[#0078d4]"
                : "text-[#969696] border-transparent hover:text-[#cccccc] hover:bg-white/5"
            )}
          >
            <span>TERMINAL</span>
            {isPythonRunning ? (
              <Loader2 className="h-3 w-3 animate-spin text-amber-400 ml-0.5" />
            ) : pythonResult ? (
              pythonResult.success ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ml-0.5" />
              )
            ) : null}
          </button>

          {/* Tab: WAVEFORM TRACES */}
          <button
            onClick={() => handleSelectTab('waveform')}
            className={cn(
              "h-full px-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors border-b-2 cursor-pointer shrink-0",
              activePanel === 'waveform' && !dockCollapsed
                ? "text-white border-[#0078d4]"
                : "text-[#969696] border-transparent hover:text-[#cccccc] hover:bg-white/5"
            )}
          >
            <span>WAVEFORM TRACES</span>
            {hasVCD && (
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded border border-cyan-500/30 ml-0.5">
                VCD
              </span>
            )}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Clear Console / Output */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]"
            onClick={handleClearActive}
            title="Clear Output"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          {/* Word Wrap Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]",
              wordWrap && "text-[#0078d4]"
            )}
            onClick={toggleWordWrap}
            title={wordWrap ? "Word Wrap: ON (Click to disable)" : "Word Wrap: OFF (Click to enable)"}
          >
            <WrapText className="h-3.5 w-3.5" />
          </Button>

          {/* Waveform Split Layout */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]",
              waveformLayout === 'side-by-side' && "text-cyan-400"
            )}
            onClick={toggleWaveformLayout}
            title={waveformLayout === 'side-by-side' ? "Dock Waveform at Bottom" : "Split Waveform Side-by-Side"}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>

          {/* Maximize / Restore Panel */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]"
            onClick={() => setDockMaximized(!dockMaximized)}
            title={dockMaximized ? "Restore Height" : "Maximize Panel"}
          >
            {dockMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Close Panel Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]"
            onClick={() => setDockCollapsed(true)}
            title="Close Panel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Dock Content Body */}
      {!dockCollapsed && (
        <div className="flex-1 min-h-0 bg-background overflow-hidden">
          {/* PROBLEMS Panel */}
          {activePanel === 'problems' && (
            <div className="h-full flex flex-col bg-[#1e1e1e] text-foreground select-none">
              {/* Filter bar */}
              <div className="p-2 border-b border-[#252526] flex items-center justify-between gap-3 bg-[#181818]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input 
                    value={problemsFilter}
                    onChange={(e) => setProblemsFilter(e.target.value)}
                    placeholder="Filter (e.g. text, error, warning)..."
                    className="h-7 pl-8 text-xs bg-[#1e1e1e] border-[#333333] focus-visible:ring-1 focus-visible:ring-[#0078d4]"
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-rose-400">{errorCount}</span> Errors
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-amber-400">{warningCount}</span> Warnings
                  </span>
                </div>
              </div>

              {/* Problem items or empty state */}
              <div className="flex-1 overflow-y-auto font-mono text-xs">
                {filteredProblems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/70 mb-2" />
                    <span className="text-xs font-medium text-foreground">
                      No problems have been detected in the workspace.
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 mt-1">
                      Diagnostics, compilation syntax issues, and synthesis errors will appear here.
                    </span>
                  </div>
                ) : (
                  <div className="divide-y divide-[#252526]">
                    {filteredProblems.map((prob) => (
                      <div
                        key={prob.id}
                        onClick={() => handleJumpToProblem(prob)}
                        className="px-3 py-2 flex items-start gap-2 hover:bg-white/5 cursor-pointer transition-colors"
                        title={prob.file ? `Jump to ${prob.file}:${prob.line || 1}` : undefined}
                      >
                        {prob.severity === 'error' ? (
                          <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-foreground/95 break-words">
                            {prob.message}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span className="bg-[#2a2d2e] px-1 py-0.2 rounded text-[10px] font-sans border border-[#333333]">
                              {prob.source}
                            </span>
                            {prob.file && (
                              <span className="text-[#0078d4] hover:underline flex items-center gap-1">
                                <FileCode2 className="h-3 w-3" />
                                <span>{prob.file}</span>
                                {prob.line && <span>[{prob.line}{prob.col ? `, ${prob.col}` : ''}]</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === 'console' && <ConsoleOutput />}
          {activePanel === 'python' && <PythonOutput />}
          {activePanel === 'waveform' && <WaveformViewer />}
          {activePanel === 'synth' && <SynthesisViewer variant="dock" />}
        </div>
      )}
    </div>
  );
}
