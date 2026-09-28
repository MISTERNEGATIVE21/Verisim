'use client';

import { useState } from 'react';
import { useIDEStore, SynthesisResult } from '@/store/ide-store';
import { synthesizeRTL } from '@/lib/tauri-db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, 
  Cpu, 
  Layers, 
  Copy, 
  Check, 
  Terminal, 
  FileCode, 
  AlertCircle, 
  Info,
  Loader2,
  RefreshCw,
  Binary,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SynthesisViewerProps {
  variant?: 'dock' | 'drawer';
}

export function categorizeCells(cellCounts: Record<string, number>) {
  let andCount = 0;
  let orCount = 0;
  let xorCount = 0;
  let dffCount = 0;
  let notCount = 0;
  let otherCount = 0;

  for (const [cell, count] of Object.entries(cellCounts)) {
    const uc = cell.toUpperCase();
    if (uc.includes('XOR') || uc.includes('XNOR')) {
      xorCount += count;
    } else if (uc.includes('AND') || uc.includes('NAND')) {
      andCount += count;
    } else if (uc.includes('OR') || uc.includes('NOR')) {
      orCount += count;
    } else if (uc.includes('DFF') || uc.includes('LATCH') || uc.includes('REG')) {
      dffCount += count;
    } else if (uc.includes('NOT') || uc.includes('INV') || uc.includes('BUF')) {
      notCount += count;
    } else {
      otherCount += count;
    }
  }

  return { andCount, orCount, xorCount, dffCount, notCount, otherCount };
}

export function SynthesisViewer({ variant = 'dock' }: SynthesisViewerProps) {
  const {
    currentProject,
    synthesisResult,
    setSynthesisResult,
    isSynthesizing,
    setSynthesizing,
    setActiveDockTab,
    setDockCollapsed,
    setIsToolchainModalOpen,
  } = useIDEStore();

  const [activeSubTab, setActiveSubTab] = useState<'gates' | 'netlist' | 'log'>('gates');
  const [copiedNetlist, setCopiedNetlist] = useState(false);
  const [copiedInstallCmd, setCopiedInstallCmd] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');

  // Extract detected modules from project files
  const availableModules: string[] = [];
  if (currentProject?.files) {
    for (const f of currentProject.files) {
      if (f.name.endsWith('.v') || f.name.endsWith('.sv')) {
        for (const line of f.content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('module')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
              const name = parts[1].replace(/[^a-zA-Z0-9_]/g, '');
              if (name && !name.endsWith('_tb') && !f.name.includes('_tb')) {
                availableModules.push(name);
              }
            }
          }
        }
      }
    }
  }

  const handleRunSynthesis = async () => {
    if (!currentProject || currentProject.files.length === 0) {
      toast.error('No project files to synthesize.');
      return;
    }

    setSynthesizing(true);
    toast.info('Running Yosys RTL-to-Gate synthesis...');

    try {
      const targetModule = selectedModule || (availableModules.length > 0 ? availableModules[0] : undefined);
      const result: SynthesisResult = await synthesizeRTL(currentProject.files, targetModule);
      setSynthesisResult(result);

      if (result.success) {
        toast.success(`Synthesis complete for module: ${result.top_module}`);
      } else {
        toast.error('Synthesis failed or Yosys not found.');
      }
    } catch (err: any) {
      console.error('Synthesis execution error:', err);
      toast.error(`Synthesis error: ${err.message || err}`);
    } finally {
      setSynthesizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNetlist(true);
    toast.success('Netlist copied to clipboard');
    setTimeout(() => setCopiedNetlist(false), 2000);
  };

  const copyInstallCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedInstallCmd(true);
    toast.success('Install command copied');
    setTimeout(() => setCopiedInstallCmd(false), 2000);
  };

  const cellCounts = synthesisResult?.cell_counts || {};
  const { andCount, orCount, xorCount, dffCount, notCount } = categorizeCells(cellCounts);
  const totalCells = Object.values(cellCounts).reduce((acc, c) => acc + c, 0);

  return (
    <div className={cn("h-full flex flex-col bg-card/40 select-text", variant === 'drawer' ? "text-xs" : "text-sm")}>
      {/* Top Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-border/70 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground/90">
            <Zap className="h-4 w-4 text-violet-500" />
            <span>RTL Gate Synthesis</span>
          </div>

          {availableModules.length > 0 && (
            <select
              value={selectedModule || (availableModules[0] || '')}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-background border border-border/80 text-foreground text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500 font-mono"
            >
              {availableModules.map((m) => (
                <option key={m} value={m}>
                  Top: {m}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab navigation in dock mode */}
          {synthesisResult && (
            <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/60">
              <button
                onClick={() => setActiveSubTab('gates')}
                className={cn(
                  "px-2 py-0.5 text-xs rounded font-medium transition-colors",
                  activeSubTab === 'gates' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Logic Gates ({totalCells})
              </button>
              <button
                onClick={() => setActiveSubTab('netlist')}
                className={cn(
                  "px-2 py-0.5 text-xs rounded font-medium transition-colors",
                  activeSubTab === 'netlist' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Netlist (.v)
              </button>
              <button
                onClick={() => setActiveSubTab('log')}
                className={cn(
                  "px-2 py-0.5 text-xs rounded font-medium transition-colors",
                  activeSubTab === 'log' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yosys Log
              </button>
            </div>
          )}

          <Button
            size="sm"
            onClick={handleRunSynthesis}
            disabled={isSynthesizing}
            className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-sm transition-all gap-1.5"
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Synthesizing...
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 fill-current" />
                Run Synthesis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3">
        {/* If no synthesis has run yet */}
        {!synthesisResult && !isSynthesizing && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
              <Cpu className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Gate-Level Logic Synthesis</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Map your behavioral Verilog and SystemVerilog RTL into technology-independent standard logic gates (AND, OR, XOR, DFF) using Yosys.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleRunSynthesis}
              className="mt-2 bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              Synthesize Current Project
            </Button>
          </div>
        )}

        {/* If synthesis failed or Yosys is missing */}
        {synthesisResult && !synthesisResult.success && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>Synthesis Diagnostic</span>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90 bg-black/40 p-3 rounded border border-border/40">
                {synthesisResult.output}
              </pre>

              {synthesisResult.error?.includes('not found') && (
                <div className="mt-3 pt-3 border-t border-red-500/20 flex flex-col gap-2">
                  <div className="text-xs text-foreground font-medium flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-400" />
                    Quick Install Command (Arch Linux):
                  </div>
                  <div className="flex items-center justify-between bg-card p-2 rounded border border-border/70 font-mono text-xs text-foreground">
                    <code>sudo pacman -S yosys</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyInstallCommand('sudo pacman -S yosys')}
                      className="h-6 px-2 text-xs"
                    >
                      {copiedInstallCmd ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsToolchainModalOpen(true)}
                      className="h-7 text-xs gap-1.5 border-border/80 text-foreground hover:bg-muted"
                    >
                      <Settings className="h-3.5 w-3.5 text-blue-400" />
                      Configure EDA Toolchain Paths
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* If synthesis succeeded */}
        {synthesisResult && synthesisResult.success && (
          <div>
            {/* Logic Gates Grid */}
            {activeSubTab === 'gates' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {/* AND / NAND Card */}
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
                    <div className="text-[11px] font-semibold text-blue-400 flex items-center justify-between">
                      <span>AND / NAND</span>
                      <Binary className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xl font-bold font-mono text-blue-500 mt-1.5">{andCount}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Basic Logic</div>
                  </div>

                  {/* OR / NOR Card */}
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
                      <span>OR / NOR</span>
                      <Binary className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-500 mt-1.5">{orCount}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Summing Logic</div>
                  </div>

                  {/* XOR / XNOR Card */}
                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
                    <div className="text-[11px] font-semibold text-purple-400 flex items-center justify-between">
                      <span>XOR / XNOR</span>
                      <Binary className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xl font-bold font-mono text-purple-500 mt-1.5">{xorCount}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Arithmetic / Parity</div>
                  </div>

                  {/* Flip Flops Card */}
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
                    <div className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
                      <span>DFF / Registers</span>
                      <Cpu className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-500 mt-1.5">{dffCount}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Sequential States</div>
                  </div>

                  {/* Inverters Card */}
                  <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20 flex flex-col justify-between">
                    <div className="text-[11px] font-semibold text-pink-400 flex items-center justify-between">
                      <span>Inverters</span>
                      <Binary className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xl font-bold font-mono text-pink-500 mt-1.5">{notCount}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Inversion / Buffers</div>
                  </div>

                  {/* Complexity Metrics Card */}
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex flex-col justify-between">
                    <div className="text-[11px] font-semibold text-cyan-400 flex items-center justify-between">
                      <span>Wires & Bits</span>
                      <Layers className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-base font-bold font-mono text-cyan-500 mt-1.5">
                      {synthesisResult.wire_count}w / {synthesisResult.bit_count}b
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {synthesisResult.public_wires} Public Wires
                    </div>
                  </div>
                </div>

                {/* Detailed Cell Counts Breakdown */}
                <div className="rounded-lg border border-border/70 overflow-hidden bg-card/60">
                  <div className="px-3 py-2 border-b border-border/70 bg-muted/30 font-semibold text-xs flex justify-between items-center">
                    <span>Synthesized Standard Cells ({synthesisResult.top_module})</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Total Gates: {totalCells}
                    </Badge>
                  </div>
                  <div className="p-3">
                    {Object.keys(cellCounts).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {Object.entries(cellCounts).map(([cell, count]) => (
                          <div
                            key={cell}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-muted/40 border border-border/40 font-mono text-xs"
                          >
                            <span className="text-foreground/80">{cell}</span>
                            <span className="font-bold text-primary">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs italic">No cells synthesized.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Synthesized Netlist Code Tab */}
            {activeSubTab === 'netlist' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-mono">synth_gates.v</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(synthesisResult.gate_verilog)}
                    className="h-6 text-xs gap-1.5"
                  >
                    {copiedNetlist ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy Netlist
                  </Button>
                </div>
                <pre className="p-3 rounded-lg bg-black/60 border border-border/60 text-xs font-mono text-emerald-400 whitespace-pre-wrap overflow-auto max-h-[350px]">
                  {synthesisResult.gate_verilog || '// Netlist empty'}
                </pre>
              </div>
            )}

            {/* Yosys Log Tab */}
            {activeSubTab === 'log' && (
              <pre className="p-3 rounded-lg bg-black/70 border border-border/60 text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-auto max-h-[350px]">
                {synthesisResult.output}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
