'use client';

import * as React from 'react';
import { useIDEStore, VerilogFile, SimulationEngine } from '@/store/ide-store';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Play,
  Zap,
  Save,
  Plus,
  FolderOpen,
  Upload,
  Settings2,
  Columns2,
  Terminal,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Keyboard,
  Info,
  Check,
  Cpu,
  FileCode,
  FileCog,
  File,
  Database,
  Layers,
  PanelLeft,
  PanelBottom,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'files' | 'commands';
  onRunSimulation?: () => void;
  onSynthesize?: () => void;
  onRunPython?: () => void;
  onSaveProject?: () => void;
  onOpenProject?: () => void;
  onImportFiles?: () => void;
  onNewProject?: () => void;
  onNewFile?: () => void;
  onOpenDocs?: () => void;
  onOpenAbout?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  mode = 'files',
  onRunSimulation,
  onSynthesize,
  onRunPython,
  onSaveProject,
  onOpenProject,
  onImportFiles,
  onNewProject,
  onNewFile,
  onOpenDocs,
  onOpenAbout,
}: CommandPaletteProps) {
  const {
    currentProject,
    openFile,
    activeFile,
    selectedEngine,
    setSelectedEngine,
    waveformLayout,
    toggleWaveformLayout,
    sidebarCollapsed,
    setSidebarCollapsed,
    dockCollapsed,
    setDockCollapsed,
    isAiAssistOpen,
    toggleAiAssist,
    setActiveActivityTab,
    setActiveDockTab,
    setIsToolchainModalOpen,
    setIsNewProjectDialogOpen,
    setSimulationResult,
    setPythonResult,
    setSynthesisResult,
    autoSuggestEnabled,
    toggleAutoSuggest,
    highlightPrimitives,
    toggleHighlightPrimitives,
    highlightSystemTasks,
    toggleHighlightSystemTasks,
  } = useIDEStore();

  const { theme, setTheme } = useTheme();
  const [search, setSearch] = React.useState('');

  // Synchronize initial input based on mode when dialog opens
  React.useEffect(() => {
    if (open) {
      if (mode === 'commands') {
        setSearch('>');
      } else {
        setSearch('');
      }
    }
  }, [open, mode]);

  const isCommandMode = search.startsWith('>') || mode === 'commands';

  const defaultRunSimulation = async () => {
    if (!currentProject) return;
    setSimulating(true);
    setSimulationResult(null);
    setActiveDockTab('console');
    setDockCollapsed(false);
    try {
      const { runSimulation: runSim } = await import('@/lib/tauri-db');
      const result: any = await runSim(currentProject.id, currentProject.files, selectedEngine);
      setSimulationResult(result);
      if (result.success) {
        toast.success(`${selectedEngine === 'verilator' ? 'Verilator' : 'Icarus'} simulation completed`);
        if (result.vcdContent) setActiveDockTab('waveform');
      } else {
        toast.error('Simulation finished with errors');
      }
    } catch (e) {
      toast.error('Failed to run simulation');
    } finally {
      setSimulating(false);
    }
  };

  const defaultSynthesize = async () => {
    if (!currentProject) return;
    setSynthesizing(true);
    setActiveDockTab('synth');
    setDockCollapsed(false);
    toast.info('Running Yosys RTL synthesis...');
    try {
      const { synthesizeRTL: syn } = await import('@/lib/tauri-db');
      const result = await syn(currentProject.files);
      setSynthesisResult(result);
      if (result.success) {
        toast.success(`Synthesis complete for module: ${result.top_module}`);
      } else {
        toast.error('Synthesis failed');
      }
    } catch (e) {
      toast.error('Synthesis error');
    } finally {
      setSynthesizing(false);
    }
  };

  const defaultRunPython = async () => {
    if (!currentProject) return;
    const targetScript = activeFile?.name.endsWith('.py')
      ? activeFile.name
      : currentProject.files.find((f) => f.name.endsWith('.py'))?.name;
    if (!targetScript) {
      toast.error('No .py file found in project');
      return;
    }
    setPythonRunning(true);
    setPythonResult(null);
    setActiveDockTab('python');
    setDockCollapsed(false);
    try {
      const { runPythonScript: runPy } = await import('@/lib/tauri-db');
      const result = await runPy(targetScript, currentProject.files);
      setPythonResult(result);
      if (result.success) toast.success(`Python script ${targetScript} completed`);
      else toast.error(`Python script ${targetScript} failed`);
    } catch (e) {
      toast.error('Error running Python');
    } finally {
      setPythonRunning(false);
    }
  };

  const defaultSaveProject = async () => {
    if (!currentProject) return;
    try {
      const { saveProjectFile: saveProj } = await import('@/lib/tauri-db');
      await saveProj(false);
      toast.success('Project saved');
    } catch (e) {
      toast.error('Failed to save project');
    }
  };

  const defaultOpenProject = async () => {
    try {
      const { openProjectFile: openProj } = await import('@/lib/tauri-db');
      const proj = await openProj();
      if (proj) toast.success(`Opened project "${proj.name}"`);
    } catch (e) {
      toast.error('Failed to open project file');
    }
  };

  const defaultImportFiles = async () => {
    try {
      const { importVerilogFiles: importFiles } = await import('@/lib/tauri-db');
      const res = await importFiles();
      if (res) toast.success('Loaded files into workspace');
    } catch (e) {
      toast.error('Failed to import files');
    }
  };

  const getFileIcon = (name: string, type?: string) => {
    if (name.endsWith('.sv') || name.endsWith('.svh') || type === 'systemverilog') {
      return <FileCode className="h-4 w-4 text-purple-400 shrink-0" />;
    }
    if (name.endsWith('.py') || type === 'python') {
      return <span className="text-xs mr-0.5 shrink-0">🐍</span>;
    }
    if (name.includes('_tb') || type === 'testbench') {
      return <FileCog className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    if (type === 'memory' || name.endsWith('.hex') || name.endsWith('.mem')) {
      return <Database className="h-4 w-4 text-cyan-400 shrink-0" />;
    }
    if (name.endsWith('.v') || type === 'verilog') {
      return <FileCode className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  const handleSelectFile = (file: VerilogFile) => {
    openFile(file);
    onOpenChange(false);
  };

  const handleAction = (callback?: () => void) => {
    onOpenChange(false);
    if (callback) {
      setTimeout(() => callback(), 50);
    }
  };

  // Custom filter supporting fuzzy matching and command prefix '>'
  const filterItem = (value: string, searchStr: string): number => {
    const rawQuery = searchStr.startsWith('>') ? searchStr.slice(1).trim() : searchStr.trim();
    if (!rawQuery) return 1;

    const query = rawQuery.toLowerCase();
    const target = value.toLowerCase();

    if (target.includes(query)) return 1;

    // Fuzzy subsequence search
    let qIdx = 0;
    for (let i = 0; i < target.length && qIdx < query.length; i++) {
      if (target[i] === query[qIdx]) qIdx++;
    }
    return qIdx === query.length ? 0.75 : 0;
  };

  const files = currentProject?.files || [];
  const hasPython = files.some((f) => f.name.endsWith('.py'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] translate-y-0 sm:max-w-[620px] p-0 overflow-hidden bg-[#1e1e1e] dark:bg-[#1e1e1e] text-[#cccccc] border-[#333333] shadow-2xl rounded-lg"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search files or run IDE commands</DialogDescription>
        </DialogHeader>

        <Command
          filter={filterItem}
          className="bg-transparent text-[#cccccc] [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-[#2e2e2e] [&_[cmdk-input]]:text-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-xs"
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={
              isCommandMode
                ? '> Type a command to run...'
                : 'Search files by name (or type > for commands)...'
            }
            className="text-white placeholder:text-muted-foreground"
          />

          <CommandList className="max-h-[360px] overflow-y-auto no-scrollbar py-1">
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
              No matching files or commands found.
            </CommandEmpty>

            {/* Quick Open Files (Hidden if in strict command mode starting with '>') */}
            {!search.startsWith('>') && files.length > 0 && (
              <CommandGroup heading="Project Files">
                {files.map((file) => (
                  <CommandItem
                    key={file.id}
                    value={`file:${file.name}`}
                    onSelect={() => handleSelectFile(file)}
                    className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(file.name, file.type)}
                      <span className="font-medium text-xs truncate">{file.name}</span>
                      {activeFile?.id === file.id && (
                        <span className="text-[10px] opacity-75 px-1 py-0.2 bg-white/10 rounded">
                          active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground data-[selected=true]:text-white/80">
                      {currentProject?.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!search.startsWith('>') && files.length > 0 && <CommandSeparator className="bg-[#2e2e2e]" />}

            {/* EDA & Simulation Commands */}
            <CommandGroup heading="EDA & Simulation">
              <CommandItem
                value="Run Simulation Simulate verilog testbench"
                onSelect={() => handleAction(onRunSimulation || defaultRunSimulation)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Run Simulation</span>
                </div>
                <CommandShortcut>Ctrl+Enter</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="Synthesize RTL Yosys Gate Netlist"
                onSelect={() => handleAction(onSynthesize || defaultSynthesize)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span>Synthesize RTL (Yosys)</span>
                </div>
              </CommandItem>

              {hasPython && (
                <CommandItem
                  value="Run Python Verification Script Testbench"
                  onSelect={() => handleAction(onRunPython || defaultRunPython)}
                  className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🐍</span>
                    <span>Run Python Verification</span>
                  </div>
                </CommandItem>
              )}

              <CommandItem
                value="Switch Engine Icarus Verilog"
                onSelect={() => {
                  setSelectedEngine('iverilog');
                  toast.success('Simulation engine switched to Icarus Verilog (-g2012)');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Engine: Icarus Verilog (-g2012)</span>
                </div>
                {selectedEngine === 'iverilog' && <Check className="h-3.5 w-3.5 text-blue-400" />}
              </CommandItem>

              <CommandItem
                value="Switch Engine Verilator"
                onSelect={() => {
                  setSelectedEngine('verilator');
                  toast.success('Simulation engine switched to Verilator 5+');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Engine: Verilator 5+</span>
                </div>
                {selectedEngine === 'verilator' && <Check className="h-3.5 w-3.5 text-blue-400" />}
              </CommandItem>

              <CommandItem
                value="EDA Toolchain Settings Compilers Paths Diagnostics"
                onSelect={() => {
                  setIsToolchainModalOpen(true);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Open EDA Toolchain Settings...</span>
                </div>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="bg-[#2e2e2e]" />

            {/* Project & File Commands */}
            <CommandGroup heading="Project & Files">
              <CommandItem
                value="New Project Create Starter Template"
                onSelect={() => {
                  if (onNewProject) onNewProject();
                  else setIsNewProjectDialogOpen(true);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>New Project...</span>
                </div>
                <CommandShortcut>Ctrl+N</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="New File Create Verilog SystemVerilog"
                onSelect={() => {
                  if (onNewFile) handleAction(onNewFile);
                  else {
                    onOpenChange(false);
                    toast.info('Use File > New File in titlebar');
                  }
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>New File...</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Open Project File vsm verilog"
                onSelect={() => handleAction(onOpenProject || defaultOpenProject)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Open Project / File...</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Import Verilog SystemVerilog External Files"
                onSelect={() => handleAction(onImportFiles || defaultImportFiles)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Import Verilog / SV Files...</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Save Project File Workspace"
                onSelect={() => handleAction(onSaveProject || defaultSaveProject)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Save className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Save Project</span>
                </div>
                <CommandShortcut>Ctrl+S</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="bg-[#2e2e2e]" />

            {/* View & Layout Commands */}
            <CommandGroup heading="View & Layout">
              <CommandItem
                value="Toggle Side-by-Side Waveform Split Layout"
                onSelect={() => {
                  toggleWaveformLayout();
                  toast.success(
                    `Waveform layout: ${waveformLayout === 'side-by-side' ? 'Docked' : 'Side-by-Side'}`
                  );
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Columns2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Toggle Side-by-Side Waveform</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Toggle Primary Sidebar Explorer"
                onSelect={() => {
                  setSidebarCollapsed(!sidebarCollapsed);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <PanelLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Toggle Sidebar</span>
                </div>
                <CommandShortcut>Ctrl+B</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="Toggle Bottom Panel Dock Console"
                onSelect={() => {
                  setDockCollapsed(!dockCollapsed);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <PanelBottom className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Toggle Bottom Panel / Dock</span>
                </div>
                <CommandShortcut>Ctrl+J</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="Show Explorer Activity File Tree"
                onSelect={() => {
                  setActiveActivityTab('files');
                  setSidebarCollapsed(false);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>View: Explorer</span>
                </div>
                <CommandShortcut>Ctrl+Shift+E</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="Show Synthesis Viewer Activity RTL Gates"
                onSelect={() => {
                  setActiveActivityTab('synth');
                  setSidebarCollapsed(false);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span>View: RTL Gate Synthesis</span>
                </div>
                <CommandShortcut>Ctrl+Shift+Y</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="Show Waveforms Dock Viewer"
                onSelect={() => {
                  setActiveDockTab('waveform');
                  setDockCollapsed(false);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Columns2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>View: Waveforms</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Toggle AI HDL Assistant Studio"
                onSelect={() => {
                  toggleAiAssist();
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Toggle HDL AI Assistant</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Clear Console Output Simulation Results"
                onSelect={() => {
                  setSimulationResult(null);
                  setPythonResult(null);
                  setSynthesisResult(null);
                  toast.success('Console output cleared');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span>Clear Console Output</span>
                </div>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="bg-[#2e2e2e]" />

            {/* Preferences & Help */}
            <CommandGroup heading="Preferences & Help">
              <CommandItem
                value="Toggle Theme Dark Light Color Scheme"
                onSelect={() => {
                  const nextTheme = theme === 'dark' ? 'light' : 'dark';
                  setTheme(nextTheme);
                  toast.success(`Theme set to ${nextTheme}`);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  )}
                  <span>Toggle Theme (Dark / Light)</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Toggle Auto Suggestions Editor Code"
                onSelect={() => {
                  toggleAutoSuggest();
                  toast.success(`Auto-suggestions ${!autoSuggestEnabled ? 'enabled' : 'disabled'}`);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Toggle Auto-Suggestions</span>
                </div>
                {autoSuggestEnabled && <Check className="h-3.5 w-3.5 text-blue-400" />}
              </CommandItem>

              <CommandItem
                value="Open Documentation Manual Verisim Guide"
                onSelect={() => handleAction(onOpenDocs)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Open Documentation & Manual</span>
                </div>
              </CommandItem>

              <CommandItem
                value="Keyboard Shortcuts Reference"
                onSelect={() => handleAction(onOpenDocs)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Keyboard Shortcuts</span>
                </div>
              </CommandItem>

              <CommandItem
                value="About Verisim IDE Version Info"
                onSelect={() => handleAction(onOpenAbout)}
                className="flex items-center justify-between cursor-pointer data-[selected=true]:bg-blue-600 data-[selected=true]:text-white rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>About Verisim</span>
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
