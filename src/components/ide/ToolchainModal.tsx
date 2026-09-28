'use client';

import React, { useEffect, useState } from 'react';
import { useIDEStore, type ToolchainConfig, type ToolchainHealth, type ToolStatus } from '@/store/ide-store';
import { checkToolchainHealth } from '@/lib/tauri-db';
import { open } from '@tauri-apps/plugin-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  Terminal,
  Zap,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ToolItemProps {
  name: string;
  binaryName: string;
  description: string;
  icon: React.ReactNode;
  status?: ToolStatus;
  customPath: string;
  useCustom: boolean;
  onPathChange: (val: string) => void;
  onBrowse: () => void;
  installHint?: string;
}

function ToolCard({
  name,
  binaryName,
  description,
  icon,
  status,
  customPath,
  useCustom,
  onPathChange,
  onBrowse,
  installHint,
}: ToolItemProps) {
  const isFound = status?.found ?? false;
  const isBundled = status?.resolved_path?.startsWith('(Bundled)') ?? false;

  return (
    <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 hover:bg-card/90 transition-all flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-muted/60 text-foreground">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">{name}</span>
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground">
                {binaryName}
              </code>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {status ? (
            isFound ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs py-0.5 px-2 flex items-center gap-1.5 font-medium",
                  isBundled
                    ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isBundled ? 'Bundled (Self-Contained)' : 'Ready'}</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs py-0.5 px-2 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Not Found</span>
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground text-xs py-0.5 px-2">
              Checking...
            </Badge>
          )}
        </div>
      </div>

      {/* Version & Resolved Path info */}
      {status && (
        <div className="text-[11px] px-2.5 py-1.5 rounded bg-muted/40 font-mono text-muted-foreground flex flex-col gap-0.5">
          {isFound ? (
            <>
              <div className="flex items-center justify-between text-foreground">
                <span className="truncate">{status.version}</span>
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  isBundled ? "text-violet-400" : "text-emerald-500"
                )}>
                  {isBundled ? 'BUNDLED' : 'SYSTEM OK'}
                </span>
              </div>
              <div className="text-muted-foreground/80 truncate text-[10px]">
                Path: {status.resolved_path}
              </div>
            </>
          ) : (
            <div className="text-amber-500/90 text-[11px] flex flex-col gap-1">
              <span>{status.error || 'Binary not found in current path configuration.'}</span>
              {installHint && (
                <div className="text-[10px] text-muted-foreground font-sans">
                  Quick install: <code className="font-mono bg-muted/80 text-foreground px-1 py-0.5 rounded">{installHint}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Path Override input */}
      {useCustom && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Input
            placeholder={`Custom path to ${binaryName} (e.g. /usr/bin/${binaryName} or /opt/...)`}
            value={customPath}
            onChange={(e) => onPathChange(e.target.value)}
            className="h-8 text-xs font-mono bg-background"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBrowse}
            className="h-8 text-xs px-2.5 gap-1.5 flex-shrink-0"
            title="Browse filesystem for binary"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Browse</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export function ToolchainModal() {
  const {
    toolchainConfig,
    setToolchainConfig,
    toolchainHealth,
    setToolchainHealth,
    isToolchainModalOpen,
    setIsToolchainModalOpen,
  } = useIDEStore();

  const [useCustomPaths, setUseCustomPaths] = useState(toolchainConfig.use_custom_paths);
  const [iverilogPath, setIverilogPath] = useState(toolchainConfig.iverilog_path || '');
  const [vvpPath, setVvpPath] = useState(toolchainConfig.vvp_path || '');
  const [verilatorPath, setVerilatorPath] = useState(toolchainConfig.verilator_path || '');
  const [yosysPath, setYosysPath] = useState(toolchainConfig.yosys_path || '');
  const [pythonPath, setPythonPath] = useState(toolchainConfig.python_path || '');

  const [isChecking, setIsChecking] = useState(false);

  // Sync state whenever modal opens or external config changes
  useEffect(() => {
    if (isToolchainModalOpen) {
      setUseCustomPaths(toolchainConfig.use_custom_paths);
      setIverilogPath(toolchainConfig.iverilog_path || '');
      setVvpPath(toolchainConfig.vvp_path || '');
      setVerilatorPath(toolchainConfig.verilator_path || '');
      setYosysPath(toolchainConfig.yosys_path || '');
      setPythonPath(toolchainConfig.python_path || '');

      // Check current health if not checked
      runHealthCheck(toolchainConfig);
    }
  }, [isToolchainModalOpen]);

  const runHealthCheck = async (cfg: ToolchainConfig) => {
    setIsChecking(true);
    try {
      const health = await checkToolchainHealth(cfg);
      setToolchainHealth(health);
    } catch (e) {
      console.error('Failed to query toolchain health:', e);
      toast.error('Failed to inspect toolchain health');
    } finally {
      setIsChecking(false);
    }
  };

  const handleBrowse = async (setter: (p: string) => void) => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: 'Select Executable Binary',
      });
      if (selected && typeof selected === 'string') {
        setter(selected);
      }
    } catch (err) {
      console.error('Dialog browse failed:', err);
    }
  };

  const handleSaveAndApply = async () => {
    const updated: ToolchainConfig = {
      use_custom_paths: useCustomPaths,
      iverilog_path: iverilogPath.trim() || undefined,
      vvp_path: vvpPath.trim() || undefined,
      verilator_path: verilatorPath.trim() || undefined,
      yosys_path: yosysPath.trim() || undefined,
      python_path: pythonPath.trim() || undefined,
    };

    setToolchainConfig(updated);
    toast.info('Validating EDA toolchain paths...');
    await runHealthCheck(updated);
    toast.success('Toolchain configuration updated & active');
    setIsToolchainModalOpen(false);
  };

  const handleResetDefaults = () => {
    setUseCustomPaths(false);
    setIverilogPath('');
    setVvpPath('');
    setVerilatorPath('');
    setYosysPath('');
    setPythonPath('');

    const defaults: ToolchainConfig = { use_custom_paths: false };
    setToolchainConfig(defaults);
    runHealthCheck(defaults);
    toast.info('Reset to system PATH auto-detection');
  };

  // Compute ready count
  const readyCount = toolchainHealth
    ? [
        toolchainHealth.iverilog.found,
        toolchainHealth.vvp.found,
        toolchainHealth.verilator.found,
        toolchainHealth.yosys.found,
        toolchainHealth.python.found,
      ].filter(Boolean).length
    : 0;

  return (
    <Dialog open={isToolchainModalOpen} onOpenChange={setIsToolchainModalOpen}>
      <DialogContent className="sm:max-w-[680px] w-[95vw] sm:w-full max-h-[88vh] overflow-y-auto bg-card border-border/80 text-foreground">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-5 w-5 text-blue-500" />
              <span>EDA Toolchain & Compilation Engines</span>
            </DialogTitle>
            <Badge
              variant="outline"
              className={
                readyCount === 5
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs'
                  : readyCount >= 3
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs'
              }
            >
              {readyCount} of 5 Tools Ready
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure HDL simulation engines (Icarus, Verilator), logic synthesis (Yosys), and Python verification environments.
          </DialogDescription>
        </DialogHeader>

        {/* Global Strategy Mode Switch */}
        <div className="p-3 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>{useCustomPaths ? 'Custom Executable Paths' : 'Bundled Verisim EDA Suite (Zero Host Dependencies)'}</span>
              {!useCustomPaths && (
                <Badge variant="outline" className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px] py-0 px-1.5">
                  Pre-Packaged
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {useCustomPaths
                ? 'Specify custom binary paths for tools installed in non-standard locations (e.g. /home/mister/Xilinx or ~/tools).'
                : 'Runs Verisim\'s internal pre-packaged EDA toolchain (Icarus, VVP, Verilator, Yosys, ABC). Works completely self-contained out-of-the-box on any Linux machine without requiring host packages!'}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-muted-foreground">Custom</span>
            <Switch
              checked={useCustomPaths}
              onCheckedChange={setUseCustomPaths}
            />
          </div>
        </div>

        {/* Tool Matrix */}
        <div className="flex flex-col gap-2.5 my-1">
          {/* 1. Verilator */}
          <ToolCard
            name="Verilator"
            binaryName="verilator"
            description="High-performance C++ cycle-accurate simulation & multi-file linting"
            icon={<Zap className="h-4 w-4 text-violet-400" />}
            status={toolchainHealth?.verilator}
            customPath={verilatorPath}
            useCustom={useCustomPaths}
            onPathChange={setVerilatorPath}
            onBrowse={() => handleBrowse(setVerilatorPath)}
            installHint="sudo pacman -S verilator"
          />

          {/* 2. Icarus Verilog */}
          <ToolCard
            name="Icarus Verilog"
            binaryName="iverilog"
            description="IEEE 1364-2001 & SystemVerilog IEEE 1800-2012 HDL compiler"
            icon={<Cpu className="h-4 w-4 text-blue-400" />}
            status={toolchainHealth?.iverilog}
            customPath={iverilogPath}
            useCustom={useCustomPaths}
            onPathChange={setIverilogPath}
            onBrowse={() => handleBrowse(setIverilogPath)}
            installHint="sudo pacman -S iverilog"
          />

          {/* 3. VVP Runtime */}
          <ToolCard
            name="VVP Simulation Runtime"
            binaryName="vvp"
            description="Icarus simulation bytecode executor with VCD waveform generation"
            icon={<Terminal className="h-4 w-4 text-cyan-400" />}
            status={toolchainHealth?.vvp}
            customPath={vvpPath}
            useCustom={useCustomPaths}
            onPathChange={setVvpPath}
            onBrowse={() => handleBrowse(setVvpPath)}
            installHint="sudo pacman -S iverilog"
          />

          {/* 4. Yosys Synthesis */}
          <ToolCard
            name="Yosys Logic Synthesis"
            binaryName="yosys"
            description="RTL elaboration, gate-level technology mapping & cell count reporting"
            icon={<Sparkles className="h-4 w-4 text-amber-400" />}
            status={toolchainHealth?.yosys}
            customPath={yosysPath}
            useCustom={useCustomPaths}
            onPathChange={setYosysPath}
            onBrowse={() => handleBrowse(setYosysPath)}
            installHint="sudo pacman -S yosys"
          />

          {/* 5. Python 3 */}
          <ToolCard
            name="Python 3 Runtime"
            binaryName="python3"
            description="Python testbenches, co-simulation verification & data stimulus scripts"
            icon={<span className="text-sm">🐍</span>}
            status={toolchainHealth?.python}
            customPath={pythonPath}
            useCustom={useCustomPaths}
            onPathChange={setPythonPath}
            onBrowse={() => handleBrowse(setPythonPath)}
            installHint="sudo pacman -S python"
          />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runHealthCheck({
                use_custom_paths: useCustomPaths,
                iverilog_path: iverilogPath || undefined,
                vvp_path: vvpPath || undefined,
                verilator_path: verilatorPath || undefined,
                yosys_path: yosysPath || undefined,
                python_path: pythonPath || undefined,
              })}
              disabled={isChecking}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Re-scan'}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              Reset to Defaults
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsToolchainModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAndApply}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Save & Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
