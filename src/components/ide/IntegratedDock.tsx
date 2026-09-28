'use client';

import { useIDEStore, DockTab } from '@/store/ide-store';
import { ConsoleOutput } from './ConsoleOutput';
import { PythonOutput } from './PythonOutput';
import { WaveformViewer } from './WaveformViewer';
import { Button } from '@/components/ui/button';
import { 
  Terminal,
  Columns2, 
  Activity, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    setSimulationResult,
    setPythonResult,
    waveformLayout,
    toggleWaveformLayout
  } = useIDEStore();

  const handleClearActive = () => {
    if (activeDockTab === 'console') {
      setSimulationResult(null);
    } else if (activeDockTab === 'python') {
      setPythonResult(null);
    }
  };

  const hasVCD = Boolean(simulationResult?.vcdContent);

  return (
    <div className={cn(
      "flex flex-col bg-background border-t border-border/70 transition-all duration-200 overflow-hidden",
      dockCollapsed ? "h-9" : "h-full"
    )}>
      {/* Dock Header Tabs & Controls */}
      <div className="h-9 px-3 flex items-center justify-between bg-muted/40 border-b border-border/40 select-none">
        {/* Left Tabs */}
        <div className="flex items-center gap-1">
          {/* Tab 1: Sim Console */}
          <button
            onClick={() => setActiveDockTab('console')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-colors border-b-2",
              activeDockTab === 'console' && !dockCollapsed
                ? "bg-background text-blue-400 border-blue-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20"
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Sim Console</span>
            {isSimulating ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-normal">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Compiling
              </span>
            ) : simulationResult ? (
              simulationResult.success ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Simulation passed" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-rose-500" title="Simulation failed" />
              )
            ) : null}
          </button>

          {/* Tab 2: Python Verification */}
          <button
            onClick={() => setActiveDockTab('python')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-colors border-b-2",
              activeDockTab === 'python' && !dockCollapsed
                ? "bg-background text-amber-400 border-amber-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20"
            )}
          >
            <span className="text-xs">🐍</span>
            <span>Python Verification</span>
            {isPythonRunning ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-normal">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Running
              </span>
            ) : pythonResult ? (
              pythonResult.success ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Python passed" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-rose-500" title="Python failed" />
              )
            ) : null}
          </button>

          {/* Tab 3: Waveform Viewer */}
          <button
            onClick={() => setActiveDockTab('waveform')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-colors border-b-2",
              activeDockTab === 'waveform' && !dockCollapsed
                ? "bg-background text-cyan-400 border-cyan-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20"
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Waveform Viewer</span>
            {hasVCD && (
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded border border-cyan-500/30">
                VCD
              </span>
            )}
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={toggleWaveformLayout}
            title={waveformLayout === 'side-by-side' ? "Dock Waveform at Bottom" : "Split Waveform Side-by-Side"}
          >
            <Columns2 className="h-3 w-3 text-blue-500" />
          </Button>
          {activeDockTab !== 'waveform' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleClearActive}
              title="Clear Active Output"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setDockMaximized(!dockMaximized)}
            title={dockMaximized ? "Restore Height" : "Maximize Dock"}
          >
            {dockMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setDockCollapsed(!dockCollapsed)}
            title={dockCollapsed ? "Expand Dock" : "Collapse Dock"}
          >
            {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Dock Content Body */}
      {!dockCollapsed && (
        <div className="flex-1 min-h-0 bg-background overflow-hidden">
          {activeDockTab === 'console' && <ConsoleOutput />}
          {activeDockTab === 'python' && <PythonOutput />}
          {activeDockTab === 'waveform' && <WaveformViewer />}
        </div>
      )}
    </div>
  );
}
