'use client';

import * as React from 'react';
import { useIDEStore, SimulationEngine, VerilogFile } from '@/store/ide-store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from '@/components/ui/menubar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Search,
  Minus,
  Square,
  X,
  Loader2,
  Code2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  createNewProject,
  saveProjectFile,
  openProjectFile,
  runSimulation as tauriRunSimulation,
  runPythonScript,
  synthesizeRTL,
  importVerilogFiles,
} from '@/lib/tauri-db';

const PROJECT_TEMPLATES = [
  { id: 'none', name: 'Empty Project', description: 'Start with a single blank Verilog file' },
  { id: 'basic', name: 'Counter (Basic)', description: '4-bit counter with testbench' },
  {
    id: 'systemverilog_fifo',
    name: 'SystemVerilog FIFO',
    description: 'Parameterized synchronous FIFO with assertions',
  },
  {
    id: 'python_verification',
    name: 'Python Verification Demo',
    description: 'ALU module verified with Python test vectors',
  },
  { id: 'mux', name: 'Multiplexer', description: '4-to-1 MUX with testbench' },
  { id: 'alu', name: 'ALU', description: 'Simple ALU with multiple operations' },
  { id: 'fsm', name: 'FSM', description: 'Traffic light controller FSM' },
  { id: 'dff', name: 'D Flip-Flop', description: 'D-Type Flip Flop with Synchronous Reset' },
  { id: 'shift_reg', name: 'Shift Register', description: '4-bit Universal Shift Register' },
  { id: 'memory', name: 'RAM Memory', description: 'Simple Single-Port RAM (16x8)' },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'P'], action: 'Quick Open / Jump to file' },
  { keys: ['Ctrl', 'Shift', 'P'], action: 'Show all IDE commands' },
  { keys: ['Ctrl', 'S'], action: 'Save current project / file' },
  { keys: ['Ctrl', 'Enter'], action: 'Run simulation' },
  { keys: ['Ctrl', 'N'], action: 'Create new project' },
  { keys: ['Ctrl', 'B'], action: 'Toggle sidebar' },
  { keys: ['Ctrl', 'J'], action: 'Toggle bottom panel / dock' },
  { keys: ['Ctrl', 'Shift', 'E'], action: 'View Explorer' },
  { keys: ['Ctrl', 'Shift', 'Y'], action: 'View RTL Gate Synthesis' },
  { keys: ['Alt', 'A'], action: 'Toggle Auto-Suggestions' },
];

export interface VSCodiumTitlebarProps {
  onOpenCommandPalette?: (mode?: 'files' | 'commands') => void;
  onOpenDocs?: () => void;
  onOpenAbout?: () => void;
}

export function VSCodiumTitlebar({
  onOpenCommandPalette,
  onOpenDocs: externalOpenDocs,
  onOpenAbout: externalOpenAbout,
}: VSCodiumTitlebarProps) {
  const {
    currentProject,
    setCurrentProject,
    setProjectFiles,
    openFile,
    activeFile,
    setActiveFile,
    isSimulating,
    setSimulating,
    setSimulationResult,
    isSynthesizing,
    setSynthesizing,
    setSynthesisResult,
    waveformLayout,
    toggleWaveformLayout,
    selectedEngine,
    setSelectedEngine,
    isAiAssistOpen,
    toggleAiAssist,
    isPythonRunning,
    setPythonRunning,
    setPythonResult,
    setActiveDockTab,
    setActiveActivityTab,
    dockCollapsed,
    setDockCollapsed,
    sidebarCollapsed,
    setSidebarCollapsed,
    setIsToolchainModalOpen,
    isNewProjectDialogOpen,
    setIsNewProjectDialogOpen,
    isNewFileDialogOpen,
    setIsNewFileDialogOpen,
    isDocsOpen,
    setIsDocsOpen,
    isAboutOpen,
    setIsAboutOpen,
    isKeyboardShortcutsOpen,
    setIsKeyboardShortcutsOpen,
  } = useIDEStore();

  // Dialog form states
  const [newFileName, setNewFileName] = React.useState('');
  const [newFileType, setNewFileType] = React.useState('systemverilog');

  // New project modal states
  const [newProjectName, setNewProjectName] = React.useState('');
  const [newProjectDesc, setNewProjectDesc] = React.useState('');
  const [selectedTemplate, setSelectedTemplate] = React.useState('none');
  const [saving, setSaving] = React.useState(false);

  const saveProject = React.useCallback(async (isSaveAs = false) => {
    if (!currentProject) return;

    setSaving(true);
    try {
      await saveProjectFile(isSaveAs);
      toast.success(isSaveAs ? 'Project saved as new file' : 'Project saved');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    } finally {
      setTimeout(() => setSaving(false), 400);
    }
  }, [currentProject]);

  const handleOpenProject = async () => {
    try {
      const proj = await openProjectFile();
      if (proj) {
        toast.success(`Opened project "${proj.name}"`);
      }
    } catch (error) {
      console.error('Failed to open project:', error);
      toast.error('Failed to open project file');
    }
  };

  const handleImportVerilog = async () => {
    try {
      const res = await importVerilogFiles();
      if (res) {
        toast.success('Loaded files into workspace');
      }
    } catch (error) {
      console.error('Failed to import files:', error);
      toast.error('Failed to import files');
    }
  };

  const runSimulation = React.useCallback(async () => {
    if (!currentProject || isSimulating) return;

    setSimulating(true);
    setSimulationResult(null);
    setActiveDockTab('console');
    setDockCollapsed(false);

    try {
      const result: any = await tauriRunSimulation(
        currentProject.id,
        currentProject.files,
        selectedEngine
      );
      setSimulationResult(result);
      if (result.success) {
        toast.success(
          `${selectedEngine === 'verilator' ? 'Verilator' : 'Icarus Verilog'} simulation completed successfully`
        );
        if (result.vcdContent) {
          setActiveDockTab('waveform');
        }
      } else {
        toast.error('Simulation finished with diagnostics/errors');
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      setSimulationResult({
        success: false,
        output: 'Failed to run simulation. Please check your toolchain installation.',
        vcdContent: undefined,
      });
      toast.error('Simulation execution failed');
    } finally {
      setSimulating(false);
    }
  }, [
    currentProject,
    isSimulating,
    selectedEngine,
    setSimulating,
    setSimulationResult,
    setActiveDockTab,
    setDockCollapsed,
  ]);

  const handleSynthesize = React.useCallback(async () => {
    if (!currentProject || isSynthesizing) return;

    setSynthesizing(true);
    setActiveDockTab('synth');
    setDockCollapsed(false);
    toast.info('Running Yosys RTL-to-Gate synthesis...');

    try {
      const result = await synthesizeRTL(currentProject.files);
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
  }, [
    currentProject,
    isSynthesizing,
    setSynthesizing,
    setActiveDockTab,
    setDockCollapsed,
    setSynthesisResult,
  ]);

  const handleRunPython = React.useCallback(async () => {
    if (!currentProject || isPythonRunning) return;

    const targetScript = activeFile?.name.endsWith('.py')
      ? activeFile.name
      : currentProject.files.find((f) => f.name.endsWith('.py'))?.name;

    if (!targetScript) {
      toast.error('No .py file found in project to execute');
      return;
    }

    setPythonRunning(true);
    setPythonResult(null);
    setActiveDockTab('python');
    setDockCollapsed(false);

    try {
      const result = await runPythonScript(targetScript, currentProject.files);
      setPythonResult(result);
      if (result.success) {
        toast.success(`Python script ${targetScript} completed`);
      } else {
        toast.error(`Python script ${targetScript} failed`);
      }
    } catch (err) {
      setPythonResult({
        success: false,
        output: `Error running python: ${err}`,
        exit_code: -1,
      });
    } finally {
      setPythonRunning(false);
    }
  }, [
    currentProject,
    activeFile,
    isPythonRunning,
    setPythonRunning,
    setPythonResult,
    setActiveDockTab,
    setDockCollapsed,
  ]);

  const handleCreateProject = () => {
    const targetName =
      newProjectName.trim() ||
      PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name.replace(/[^a-zA-Z0-9_]/g, '_') ||
      'My_Project';

    try {
      createNewProject(targetName, newProjectDesc, selectedTemplate);
      setIsNewProjectDialogOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setSimulationResult(null);
      setPythonResult(null);
      setSynthesisResult(null);
      toast.success(`Created project "${targetName}"`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
    }
  };

  const handleCreateFile = () => {
    if (!newFileName.trim() || !currentProject) return;

    let name = newFileName.trim();
    if (!name.includes('.')) {
      switch (newFileType) {
        case 'systemverilog':
          name += '.sv';
          break;
        case 'python':
          name += '.py';
          break;
        case 'testbench':
          name += '_tb.sv';
          break;
        case 'verilog':
          name += '.v';
          break;
        case 'memory':
          name += '.hex';
          break;
        default:
          name += '.sv';
          break;
      }
    }

    const baseName = name.replace(/\.[^/.]+$/, '');
    let content = `module ${baseName}(\n    input wire clk,\n    input wire rst\n);\n\nendmodule\n`;
    if (name.endsWith('.sv')) {
      content = `// SystemVerilog Module\nmodule ${baseName} #(\n    parameter int DATA_WIDTH = 8\n) (\n    input  logic                  clk,\n    input  logic                  rst_n,\n    input  logic [DATA_WIDTH-1:0] data_in,\n    output logic [DATA_WIDTH-1:0] data_out\n);\n\n    always_ff @(posedge clk or negedge rst_n) begin\n        if (!rst_n) begin\n            data_out <= '0;\n        end else begin\n            data_out <= data_in;\n        end\n    end\n\nendmodule\n`;
    } else if (name.endsWith('.py')) {
      content = `#!/usr/bin/env python3\n"""\nPython Verification Script: ${baseName}\n"""\n\ndef main():\n    print("Running Python verification for ${baseName}...")\n\nif __name__ == "__main__":\n    main()\n`;
    }

    const now = new Date().toISOString();
    const newFile: VerilogFile = {
      id: `${currentProject.id}:${name}`,
      name,
      content,
      type: newFileType,
      project_id: currentProject.id,
      created_at: now,
      updated_at: now,
    };

    const updatedFiles = [...(currentProject.files || []), newFile];
    setProjectFiles(updatedFiles);
    openFile(newFile);
    setActiveFile(newFile);
    toast.success(`Created file ${name}`);

    setIsNewFileDialogOpen(false);
    setNewFileName('');
  };

  const handleExit = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      if (typeof window !== 'undefined') {
        window.close();
      }
    }
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      // fallback
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch {
      // fallback
    }
  };

  const openDocsModal = () => {
    if (externalOpenDocs) externalOpenDocs();
    setIsDocsOpen(true);
  };

  const openAboutModal = () => {
    if (externalOpenAbout) externalOpenAbout();
    setIsAboutOpen(true);
  };

  const hasPython = currentProject?.files.some((f) => f.name.endsWith('.py')) || false;

  const titleCenterText = currentProject
    ? `verisim-ide — ${currentProject.name}${activeFile ? ` — ${activeFile.name}` : ''}`
    : 'verisim-ide — Welcome';

  return (
    <header className="h-[35px] min-h-[35px] max-h-[35px] bg-[#1f1f1f] dark:bg-[#1f1f1f] text-[#cccccc] border-b border-[#2b2b2b] select-none flex items-center justify-between px-2 text-xs relative z-50 overflow-hidden">
      {/* ── LEFT ZONE: Logo & Menubar ── */}
      <div className="flex items-center gap-1 min-w-0 shrink-0">
        {/* VSCodium / Verisim Brand Icon */}
        <div
          className="h-5 w-5 rounded bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mr-1 cursor-pointer hover:bg-blue-500/30 transition-colors"
          onClick={() => onOpenCommandPalette?.('commands')}
          title="Verisim EDA Studio — Click to open Command Palette"
        >
          <Code2 className="h-3 w-3 text-blue-400" />
        </div>

        {/* Standard VSCodium Dropdown Menus */}
        <Menubar className="bg-transparent border-0 p-0 h-6 shadow-none flex items-center gap-0.5">
          {/* FILE MENU */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 px-2 py-0 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white data-[state=open]:bg-[#333333] data-[state=open]:text-white rounded-sm font-normal cursor-pointer select-none">
              File
            </MenubarTrigger>
            <MenubarContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[13rem] shadow-xl">
              <MenubarItem
                onClick={() => {
                  if (currentProject) setIsNewFileDialogOpen(true);
                  else toast.info('Open or create a project first');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>New File</span>
              </MenubarItem>

              <MenubarItem
                onClick={() => setIsNewProjectDialogOpen(true)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>New Project...</span>
                <MenubarShortcut>Ctrl+N</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={handleOpenProject}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Open Project / File...</span>
                <MenubarShortcut>Ctrl+O</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={handleImportVerilog}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Import Verilog / SV...</span>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                disabled={!currentProject}
                onClick={() => saveProject(false)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Save File</span>
                <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                disabled={!currentProject}
                onClick={() => saveProject(false)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Save Project</span>
              </MenubarItem>

              <MenubarItem
                disabled={!currentProject}
                onClick={() => saveProject(true)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Save Project As...</span>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                disabled={!currentProject}
                onClick={() => {
                  setCurrentProject(null);
                  setSimulationResult(null);
                  setPythonResult(null);
                  setSynthesisResult(null);
                  toast.info('Closed active project');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Close Project</span>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={handleExit}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Exit</span>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* EDIT MENU */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 px-2 py-0 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white data-[state=open]:bg-[#333333] data-[state=open]:text-white rounded-sm font-normal cursor-pointer select-none">
              Edit
            </MenubarTrigger>
            <MenubarContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[12rem] shadow-xl">
              <MenubarItem
                onClick={() => {
                  if (typeof document !== 'undefined') document.execCommand('undo');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Undo</span>
                <MenubarShortcut>Ctrl+Z</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={() => {
                  if (typeof document !== 'undefined') document.execCommand('redo');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Redo</span>
                <MenubarShortcut>Ctrl+Y</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={() => {
                  if (typeof document !== 'undefined') document.execCommand('cut');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Cut</span>
                <MenubarShortcut>Ctrl+X</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={() => {
                  if (typeof document !== 'undefined') document.execCommand('copy');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Copy</span>
                <MenubarShortcut>Ctrl+C</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={() => {
                  if (typeof document !== 'undefined') document.execCommand('paste');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Paste</span>
                <MenubarShortcut>Ctrl+V</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={() => {
                  onOpenCommandPalette?.('commands');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Find</span>
                <MenubarShortcut>Ctrl+F</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* SELECTION MENU */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 px-2 py-0 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white data-[state=open]:bg-[#333333] data-[state=open]:text-white rounded-sm font-normal cursor-pointer select-none">
              Selection
            </MenubarTrigger>
            <MenubarContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[12rem] shadow-xl">
              <MenubarItem
                onClick={() => {
                  if (typeof document !== 'undefined') document.execCommand('selectAll');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Select All</span>
                <MenubarShortcut>Ctrl+A</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* VIEW MENU */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 px-2 py-0 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white data-[state=open]:bg-[#333333] data-[state=open]:text-white rounded-sm font-normal cursor-pointer select-none">
              View
            </MenubarTrigger>
            <MenubarContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[13rem] shadow-xl">
              <MenubarItem
                onClick={() => {
                  setActiveActivityTab('files');
                  setSidebarCollapsed(false);
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Explorer</span>
                <MenubarShortcut>Ctrl+Shift+E</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={() => {
                  setActiveActivityTab('synth');
                  setSidebarCollapsed(false);
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Synthesis</span>
                <MenubarShortcut>Ctrl+Shift+Y</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={() => {
                  setActiveDockTab('waveform');
                  setDockCollapsed(false);
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Waveforms</span>
              </MenubarItem>

              <MenubarItem
                onClick={toggleAiAssist}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>AI Studio</span>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Toggle Sidebar</span>
                <MenubarShortcut>Ctrl+B</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={() => setDockCollapsed(!dockCollapsed)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Toggle Bottom Panel</span>
                <MenubarShortcut>Ctrl+J</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={toggleWaveformLayout}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Side-by-Side Waveform</span>
                {waveformLayout === 'side-by-side' && <Check className="h-3.5 w-3.5 ml-auto text-blue-400" />}
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* RUN MENU */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 px-2 py-0 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white data-[state=open]:bg-[#333333] data-[state=open]:text-white rounded-sm font-normal cursor-pointer select-none">
              Run
            </MenubarTrigger>
            <MenubarContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[14rem] shadow-xl">
              <MenubarItem
                disabled={!currentProject || isSimulating}
                onClick={runSimulation}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <div className="flex items-center gap-2">
                  <Play className="h-3 w-3 text-emerald-400" />
                  <span>Run Simulation</span>
                </div>
                <MenubarShortcut>Ctrl+Enter</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                disabled={!currentProject || isSynthesizing}
                onClick={handleSynthesize}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-violet-400" />
                  <span>Synthesize RTL (Yosys)</span>
                </div>
              </MenubarItem>

              <MenubarItem
                disabled={!currentProject || isPythonRunning}
                onClick={handleRunPython}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">🐍</span>
                  <span>Run Python Testbench</span>
                </div>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarSub>
                <MenubarSubTrigger className="cursor-pointer focus:bg-blue-600 focus:text-white">
                  <span>Simulation Engine</span>
                </MenubarSubTrigger>
                <MenubarSubContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[12rem] shadow-xl">
                  <MenubarItem
                    onClick={() => {
                      setSelectedEngine('iverilog');
                      toast.success('Simulation engine set to Icarus Verilog');
                    }}
                    className="cursor-pointer focus:bg-blue-600 focus:text-white"
                  >
                    <span>Icarus Verilog (-g2012)</span>
                    {selectedEngine === 'iverilog' && <Check className="h-3.5 w-3.5 ml-auto text-blue-400" />}
                  </MenubarItem>
                  <MenubarItem
                    onClick={() => {
                      setSelectedEngine('verilator');
                      toast.success('Simulation engine set to Verilator 5+');
                    }}
                    className="cursor-pointer focus:bg-blue-600 focus:text-white"
                  >
                    <span>Verilator 5+</span>
                    {selectedEngine === 'verilator' && <Check className="h-3.5 w-3.5 ml-auto text-blue-400" />}
                  </MenubarItem>
                </MenubarSubContent>
              </MenubarSub>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={() => setIsToolchainModalOpen(true)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-3 w-3 text-amber-400" />
                  <span>EDA Toolchain Settings...</span>
                </div>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* TERMINAL MENU */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 px-2 py-0 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white data-[state=open]:bg-[#333333] data-[state=open]:text-white rounded-sm font-normal cursor-pointer select-none">
              Terminal
            </MenubarTrigger>
            <MenubarContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[12rem] shadow-xl">
              <MenubarItem
                onClick={() => setDockCollapsed(!dockCollapsed)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Toggle Integrated Dock</span>
                <MenubarShortcut>Ctrl+J</MenubarShortcut>
              </MenubarItem>

              <MenubarItem
                onClick={() => {
                  setSimulationResult(null);
                  setPythonResult(null);
                  setSynthesisResult(null);
                  toast.success('Console cleared');
                }}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Clear Console</span>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* HELP MENU */}
          <MenubarMenu>
            <MenubarTrigger className="h-6 px-2 py-0 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white data-[state=open]:bg-[#333333] data-[state=open]:text-white rounded-sm font-normal cursor-pointer select-none">
              Help
            </MenubarTrigger>
            <MenubarContent className="bg-[#252526] text-[#cccccc] border-[#333333] text-xs py-1 min-w-[13rem] shadow-xl">
              <MenubarItem
                onClick={openDocsModal}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Keyboard Shortcuts</span>
              </MenubarItem>

              <MenubarItem
                onClick={() => setIsToolchainModalOpen(true)}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>EDA Toolchain Diagnostics</span>
              </MenubarItem>

              <MenubarItem
                onClick={openDocsModal}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>Documentation</span>
              </MenubarItem>

              <MenubarSeparator className="bg-[#3c3c3c]" />

              <MenubarItem
                onClick={openAboutModal}
                className="cursor-pointer focus:bg-blue-600 focus:text-white"
              >
                <span>About Verisim</span>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* ── CENTER ZONE: Command Palette Launcher ── */}
      <div className="flex-1 flex justify-center max-w-[500px] mx-2">
        <button
          type="button"
          onClick={() => onOpenCommandPalette?.('files')}
          className="w-full max-w-[380px] h-[22px] px-2.5 flex items-center justify-between text-xs rounded bg-[#2d2d2d] hover:bg-[#383838] border border-[#3c3c3c] cursor-pointer text-[#cccccc] transition-colors shadow-xs group"
          title="Search files or run commands (Ctrl+P)"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Search className="h-3 w-3 text-muted-foreground group-hover:text-blue-400 transition-colors shrink-0" />
            <span className="truncate text-[11px] text-muted-foreground group-hover:text-foreground">
              {titleCenterText}
            </span>
          </div>

          <kbd className="text-[10px] text-muted-foreground bg-black/20 group-hover:bg-black/40 px-1 rounded border border-white/5 font-mono ml-2 shrink-0">
            Ctrl+P
          </kbd>
        </button>
      </div>

      {/* ── RIGHT ZONE: EDA Actions, Toggles, Window Controls ── */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        {/* Engine Selector */}
        <Select
          value={selectedEngine}
          onValueChange={(val) => setSelectedEngine(val as SimulationEngine)}
        >
          <SelectTrigger className="h-[22px] text-[11px] w-[92px] px-1.5 bg-[#2d2d2d] border-[#3c3c3c] text-[#cccccc] font-normal hover:bg-[#383838]">
            <Cpu className="h-3 w-3 mr-1 text-blue-400 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#252526] border-[#333333] text-xs">
            <SelectItem value="iverilog">Icarus</SelectItem>
            <SelectItem value="verilator">Verilator</SelectItem>
          </SelectContent>
        </Select>

        {/* Quick Run Button */}
        <Button
          size="sm"
          className="h-[22px] px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
          onClick={runSimulation}
          disabled={!currentProject || isSimulating}
          title="Run Simulation (Ctrl+Enter)"
        >
          {isSimulating ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Play className="h-3 w-3 mr-1 fill-white" />
          )}
          <span>Run</span>
        </Button>

        {/* Quick Synthesize Button */}
        <Button
          size="sm"
          className="h-[22px] px-2 text-[11px] bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-xs hidden sm:inline-flex"
          onClick={handleSynthesize}
          disabled={!currentProject || isSynthesizing}
          title="Synthesize RTL (Yosys)"
        >
          {isSynthesizing ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Zap className="h-3 w-3 mr-1 fill-white" />
          )}
          <span>Synth</span>
        </Button>

        {/* Python Run Button (if python files present) */}
        {currentProject && hasPython && (
          <Button
            size="sm"
            variant="outline"
            className="h-[22px] px-1.5 text-[11px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hidden md:inline-flex"
            onClick={handleRunPython}
            disabled={isPythonRunning}
            title="Run Python Verification Script"
          >
            {isPythonRunning ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <span className="text-[10px] mr-1">🐍</span>
            )}
            <span>Python</span>
          </Button>
        )}

        {/* Split Editor Toggle */}
        {currentProject && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-[22px] w-[22px] text-muted-foreground hover:text-foreground hover:bg-[#333333]',
              waveformLayout === 'side-by-side' && 'text-blue-400 bg-blue-500/20'
            )}
            onClick={toggleWaveformLayout}
            title="Toggle Side-by-Side Waveform Split"
          >
            <Columns2 className="h-3 w-3" />
          </Button>
        )}

        {/* Toggle Sidebar */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-[22px] w-[22px] text-muted-foreground hover:text-foreground hover:bg-[#333333]',
            !sidebarCollapsed && 'text-blue-400'
          )}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title="Toggle Primary Sidebar (Ctrl+B)"
        >
          <PanelLeft className="h-3 w-3" />
        </Button>

        {/* Toggle Bottom Dock */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-[22px] w-[22px] text-muted-foreground hover:text-foreground hover:bg-[#333333]',
            !dockCollapsed && 'text-blue-400'
          )}
          onClick={() => setDockCollapsed(!dockCollapsed)}
          title="Toggle Bottom Panel / Dock (Ctrl+J)"
        >
          <PanelBottom className="h-3 w-3" />
        </Button>

        {/* Theme Toggle */}
        <div className="scale-90 origin-center">
          <ThemeToggle />
        </div>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center h-full ml-1 border-l border-[#333333] pl-1">
          <button
            type="button"
            onClick={handleMinimize}
            className="h-[22px] w-[22px] flex items-center justify-center hover:bg-[#333333] text-muted-foreground hover:text-foreground rounded-xs transition-colors"
            title="Minimize"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="h-[22px] w-[22px] flex items-center justify-center hover:bg-[#333333] text-muted-foreground hover:text-foreground rounded-xs transition-colors"
            title="Maximize"
          >
            <Square className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="h-[22px] w-[22px] flex items-center justify-center hover:bg-rose-600 text-muted-foreground hover:text-white rounded-xs transition-colors"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── MODALS / DIALOGS ── */}

      {/* New Project Dialog */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent className="sm:max-w-[440px] w-[95vw] sm:w-full bg-[#252526] border-[#333333] text-[#cccccc]">
          <DialogHeader>
            <DialogTitle className="text-white">Create New EDA Project</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Choose from Verilog, SystemVerilog, or Python verification starter templates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="titlebar-proj-name" className="text-xs">
                Project Name
              </Label>
              <Input
                id="titlebar-proj-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. FIFO_Controller"
                autoFocus
                className="bg-[#1e1e1e] border-[#3c3c3c] text-xs text-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="titlebar-proj-desc" className="text-xs">
                Description (optional)
              </Label>
              <Textarea
                id="titlebar-proj-desc"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Description of target architecture..."
                rows={2}
                className="bg-[#1e1e1e] border-[#3c3c3c] text-xs text-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-[#1e1e1e] border-[#3c3c3c] text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252526] border-[#333333] text-xs text-[#cccccc]">
                  {PROJECT_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {template.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNewProjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleCreateProject}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New File Dialog */}
      <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent className="sm:max-w-[400px] w-[95vw] sm:w-full bg-[#252526] border-[#333333] text-[#cccccc]">
          <DialogHeader>
            <DialogTitle className="text-white">Create New File</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Add a new Verilog, SystemVerilog, Python or testbench file to {currentProject?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="titlebar-file-name" className="text-xs">
                File Name
              </Label>
              <Input
                id="titlebar-file-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. alu.sv, test_alu.py"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                }}
                className="bg-[#1e1e1e] border-[#3c3c3c] text-xs text-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">File Type</Label>
              <Select value={newFileType} onValueChange={setNewFileType}>
                <SelectTrigger className="bg-[#1e1e1e] border-[#3c3c3c] text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252526] border-[#333333] text-xs text-[#cccccc]">
                  <SelectItem value="systemverilog">SystemVerilog (.sv)</SelectItem>
                  <SelectItem value="verilog">Verilog (.v)</SelectItem>
                  <SelectItem value="python">Python Verification (.py)</SelectItem>
                  <SelectItem value="testbench">SystemVerilog Testbench (_tb.sv)</SelectItem>
                  <SelectItem value="memory">Memory Initialization (.hex)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNewFileDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleCreateFile}
            >
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documentation Dialog */}
      <Dialog open={isDocsOpen} onOpenChange={setIsDocsOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto bg-[#252526] border-[#333333] text-[#cccccc]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <BookOpen className="h-5 w-5 text-blue-400" />
              Verisim All-in-One IDE Manual
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              SystemVerilog, Icarus, Verilator, Yosys gate synthesis, and waveform guide.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <section>
              <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-blue-400">
                <Cpu className="h-4 w-4" />
                Dual-Engine Simulation & Tracing
              </h4>
              <div className="space-y-1 text-muted-foreground leading-relaxed">
                <p>
                  • <strong>Icarus Verilog:</strong> Simulates Verilog and SystemVerilog with full
                  IEEE 1800-2012 flag (<code className="text-blue-300">-g2012</code>) and generates standard <code className="text-blue-300">.vcd</code> waveform dumps.
                </p>
                <p>
                  • <strong>Verilator 5+:</strong> Builds high-speed C++ compiled simulation binaries
                  (<code className="text-blue-300">--binary --trace</code>) and executes cycle-accurate waveform traces.
                </p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-violet-400">
                <Zap className="h-4 w-4" />
                Yosys Gate-Level Synthesis
              </h4>
              <div className="space-y-1 text-muted-foreground leading-relaxed">
                <p>
                  • Synthesizes RTL designs into standard gate-level cells (AND, OR, XOR, DFF) and
                  displays cell counts and netlists.
                </p>
                <p>• Run synthesis directly from the toolbar, menubar, or Gate Synthesis tab.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-white">
                <Keyboard className="h-4 w-4 text-amber-400" />
                Keyboard Shortcuts
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5 bg-[#1e1e1e] rounded border border-[#333333]"
                  >
                    <span className="text-muted-foreground">{shortcut.action}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd
                          key={j}
                          className="px-1.5 py-0.5 bg-[#2d2d2d] rounded text-[10px] font-mono text-white border border-[#3c3c3c]"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* About Verisim Dialog */}
      <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
        <DialogContent className="sm:max-w-[420px] w-[95vw] sm:w-full bg-[#252526] border-[#333333] text-[#cccccc]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Code2 className="h-5 w-5 text-blue-400" />
              About Verisim IDE
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Verisim is a modern, cross-platform SystemVerilog & Verilog Electronic Design Automation (EDA) IDE featuring cycle-accurate waveform visualization, Yosys gate synthesis, and dual-engine simulation.
            </p>
            <div className="p-2.5 bg-[#1e1e1e] rounded border border-[#333333] space-y-1 font-mono text-[11px]">
              <div><strong>Version:</strong> 6.1.0</div>
              <div><strong>Architecture:</strong> Tauri 2.0 + Next.js (Turbopack)</div>
              <div><strong>EDA Toolchain:</strong> OSS CAD Suite (Yosys, Icarus, Verilator)</div>
              <div><strong>Author:</strong> MISTERNEGATIVE21</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsAboutOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
