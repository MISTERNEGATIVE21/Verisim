'use client';

import { useIDEStore, SimulationEngine } from '@/store/ide-store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Plus, 
  Save,
  Loader2,
  Code2,
  BookOpen,
  Keyboard,
  Zap,
  Cpu,
  Columns2,
  FolderOpen,
  Sparkles,
  Settings2,
  Menu,
  Upload
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  createNewProject,
  saveProjectFile,
  openProjectFile,
  runSimulation as tauriRunSimulation,
  runPythonScript,
  synthesizeRTL,
  importVerilogFiles
} from '@/lib/tauri-db';

const PROJECT_TEMPLATES = [
  { id: 'none', name: 'Empty Project', description: 'Start with a single blank Verilog file' },
  { id: 'basic', name: 'Counter (Basic)', description: '4-bit counter with testbench' },
  { id: 'systemverilog_fifo', name: 'SystemVerilog FIFO', description: 'Parameterized synchronous FIFO with assertions' },
  { id: 'python_verification', name: 'Python Verification Demo', description: 'ALU module verified with Python test vectors' },
  { id: 'mux', name: 'Multiplexer', description: '4-to-1 MUX with testbench' },
  { id: 'alu', name: 'ALU', description: 'Simple ALU with multiple operations' },
  { id: 'fsm', name: 'FSM', description: 'Traffic light controller FSM' },
  { id: 'dff', name: 'D Flip-Flop', description: 'D-Type Flip Flop with Synchronous Reset' },
  { id: 'shift_reg', name: 'Shift Register', description: '4-bit Universal Shift Register' },
  { id: 'memory', name: 'RAM Memory', description: 'Simple Single-Port RAM (16x8)' },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'S'], action: 'Save current file' },
  { keys: ['Ctrl', 'Enter'], action: 'Run simulation' },
  { keys: ['Alt', 'A'], action: 'Toggle Auto-Suggestions' },
  { keys: ['Ctrl', 'N'], action: 'New project' },
  { keys: ['Ctrl', 'B'], action: 'Toggle sidebar' },
  { keys: ['Ctrl', 'W'], action: 'Close current file' },
];

export function Toolbar() {
  const { 
    currentProject, 
    setCurrentProject,
    isSimulating, 
    setSimulating,
    setSimulationResult,
    synthesisResult,
    setSynthesisResult,
    isSynthesizing,
    setSynthesizing,
    waveformLayout,
    toggleWaveformLayout,
    selectedEngine,
    setSelectedEngine,
    autoSuggestEnabled,
    toggleAutoSuggest,
    highlightPrimitives,
    toggleHighlightPrimitives,
    highlightSystemTasks,
    toggleHighlightSystemTasks,
    isAiAssistOpen,
    toggleAiAssist,
    isPythonRunning,
    setPythonRunning,
    setPythonResult,
    setActiveDockTab,
    setDockCollapsed,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeFile,
  } = useIDEStore();
  
  const { isNewProjectDialogOpen, setIsNewProjectDialogOpen } = useIDEStore();
  const [docsOpen, setDocsOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('none');
  const [saving, setSaving] = useState(false);

  const saveProject = useCallback(async () => {
    if (!currentProject) return;
    
    setSaving(true);
    try {
      await saveProjectFile(false);
      toast.success('Project saved');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    } finally {
      setTimeout(() => setSaving(false), 500);
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

  const runSimulation = useCallback(async () => {
    if (!currentProject || isSimulating) return;
    
    setSimulating(true);
    setSimulationResult(null);
    setActiveDockTab('console');
    setDockCollapsed(false);
    
    try {
      const result: any = await tauriRunSimulation(currentProject.id, currentProject.files, selectedEngine);
      setSimulationResult(result);
      if (result.success) {
        toast.success(`${selectedEngine === 'verilator' ? 'Verilator Simulation' : 'Simulation'} completed successfully`);
        // If VCD was generated, activate waveform tab automatically
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
  }, [currentProject, isSimulating, selectedEngine, setSimulating, setSimulationResult, setActiveDockTab, setDockCollapsed]);

  const handleSynthesize = useCallback(async () => {
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
  }, [currentProject, isSynthesizing, setSynthesizing, setActiveDockTab, setDockCollapsed, setSynthesisResult]);

  const handleRunPython = useCallback(async () => {
    if (!currentProject || isPythonRunning) return;

    const targetScript = activeFile?.name.endsWith('.py') 
      ? activeFile.name 
      : currentProject.files.find(f => f.name.endsWith('.py'))?.name;

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
        exit_code: -1
      });
    } finally {
      setPythonRunning(false);
    }
  }, [currentProject, activeFile, isPythonRunning, setPythonRunning, setPythonResult, setActiveDockTab, setDockCollapsed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveProject();
            break;
          case 'enter':
            e.preventDefault();
            runSimulation();
            break;
          case 'n':
            e.preventDefault();
            setIsNewProjectDialogOpen(true);
            break;
          case 'b':
            e.preventDefault();
            setSidebarCollapsed(!sidebarCollapsed);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, activeFile, currentProject, isSimulating, saveProject, runSimulation, setIsNewProjectDialogOpen, setSidebarCollapsed]);

  const createProject = () => {
    const targetName = newProjectName.trim() || PROJECT_TEMPLATES.find(t => t.id === selectedTemplate)?.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'My_Project';
    
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

  const closeProject = () => {
    setCurrentProject(null);
    setSimulationResult(null);
    setPythonResult(null);
    setSynthesisResult(null);
  };

  const hasPython = currentProject?.files.some(f => f.name.endsWith('.py')) || false;

  return (
    <header className="flex items-center justify-between px-3 py-1.5 gap-2 border-b border-border/70 bg-card text-foreground select-none overflow-x-auto no-scrollbar">
      {/* ── ZONE 1: Workspace & Project (Left) ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Sidebar Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-600/10 border border-blue-500/40 flex items-center justify-center">
            <Code2 className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="font-bold text-xs tracking-tight text-foreground hidden sm:inline">
            Verisim IDE
          </span>
        </div>

        {/* Active Project Pill */}
        {currentProject && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/50">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
              {currentProject.name}
            </span>
          </div>
        )}

        {/* Primary Project Buttons */}
        <div className="flex items-center gap-1 pl-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs shrink-0 border-border/60"
            onClick={() => setIsNewProjectDialogOpen(true)}
            title="New Project (Ctrl+N)"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">New</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs shrink-0 border-border/60"
            onClick={handleOpenProject}
            title="Open Verilog (.v, .sv) or Project (.vsm)"
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Open</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs shrink-0 border-border/60"
            onClick={handleImportVerilog}
            title="Import / Load Verilog & SystemVerilog files (.v, .sv, .py)"
          >
            <Upload className="h-3.5 w-3.5 mr-1 text-blue-400" />
            <span className="hidden sm:inline">Import</span>
          </Button>

          {currentProject && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs shrink-0 border-border/60"
              onClick={saveProject}
              disabled={saving}
              title="Save Project (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── ZONE 2: EDA Action Hub (Center) ── */}
      <div className="flex items-center gap-1.5 shrink-0 bg-muted/30 p-1 rounded-lg border border-border/50 shadow-inner">
        {/* Simulation Engine Selector */}
        <Select 
          value={selectedEngine} 
          onValueChange={(val) => setSelectedEngine(val as SimulationEngine)}
        >
          <SelectTrigger className="h-7 text-xs w-[130px] shrink-0 bg-background border-border/60 font-medium">
            <Cpu className="h-3.5 w-3.5 mr-1 text-blue-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border/80 text-xs">
            <SelectItem value="iverilog">Icarus (-g2012)</SelectItem>
            <SelectItem value="verilator">Verilator 5+</SelectItem>
          </SelectContent>
        </Select>

        {/* Simulate Button */}
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-medium shadow-sm transition-all"
          onClick={runSimulation}
          disabled={!currentProject || isSimulating}
          title="Run Simulation (Ctrl+Enter)"
        >
          {isSimulating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 mr-1 fill-white" />
              <span>Simulate</span>
            </>
          )}
        </Button>

        {/* Synthesize Button */}
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs bg-violet-600 hover:bg-violet-700 text-white shrink-0 font-medium shadow-sm transition-all"
          onClick={handleSynthesize}
          disabled={!currentProject || isSynthesizing}
          title="Synthesize RTL to Gate-Level Standard Cells (Yosys)"
        >
          {isSynthesizing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              <span>Synthesizing...</span>
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 mr-1 fill-white" />
              <span>Synthesize</span>
            </>
          )}
        </Button>

        {/* Python Verification Button (Conditional) */}
        {currentProject && hasPython && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs shrink-0 font-medium border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            onClick={handleRunPython}
            disabled={isPythonRunning}
            title="Run Python Verification Script"
          >
            {isPythonRunning ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <span className="text-xs mr-1">🐍</span>
            )}
            <span>Python</span>
          </Button>
        )}
      </div>

      {/* ── ZONE 3: Layout & Utility (Right) ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Waveform Layout Split Toggle */}
        {currentProject && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs shrink-0 border-border/60",
              waveformLayout === 'side-by-side' ? "bg-blue-500/15 text-blue-400 border-blue-500/40" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={toggleWaveformLayout}
            title="Toggle Side-by-Side Waveform Split"
          >
            <Columns2 className="h-3.5 w-3.5 mr-1 text-blue-400" />
            <span className="hidden md:inline">{waveformLayout === 'side-by-side' ? 'Split Waveform' : 'Dock Waveform'}</span>
          </Button>
        )}

        {/* AI Assistant Studio Toggle */}
        <Button
          variant={isAiAssistOpen ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-7 px-2 text-xs shrink-0 border-border/60",
            isAiAssistOpen ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:text-blue-400"
          )}
          onClick={toggleAiAssist}
          title="Toggle HDL Design Assistant"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1 text-blue-400" />
          <span className="hidden md:inline">HDL AI</span>
        </Button>

        {/* Syntax Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Editor Settings">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border-border/80 text-xs w-52">
            <DropdownMenuLabel>Highlight Options</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuCheckboxItem
              checked={highlightPrimitives}
              onCheckedChange={toggleHighlightPrimitives}
            >
              Highlight Gate Primitives
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={highlightSystemTasks}
              onCheckedChange={toggleHighlightSystemTasks}
            >
              Highlight System Tasks ($)
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuCheckboxItem
              checked={autoSuggestEnabled}
              onCheckedChange={toggleAutoSuggest}
            >
              Inline Auto-Suggestions
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Documentation Dialog */}
        <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0 text-muted-foreground hover:text-foreground">
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              <span className="hidden md:inline">Docs</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto bg-card border-border/80 text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-400" />
                Verisim All-in-One IDE Manual
              </DialogTitle>
              <DialogDescription>
                SystemVerilog, Icarus, Verilator, Yosys gate synthesis, and waveform guide.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5 py-3 text-xs">
              <section>
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-blue-400">
                  <Cpu className="h-4 w-4" />
                  Dual-Engine Simulation & Tracing
                </h4>
                <div className="space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>• <strong>Icarus Verilog:</strong> Simulates Verilog and SystemVerilog with full IEEE 1800-2012 flag (`-g2012`) and generates standard `.vcd` waveform dumps.</p>
                  <p>• <strong>Verilator 5+:</strong> Builds high-speed C++ compiled simulation binaries (`--binary --trace`) and executes cycle-accurate waveform traces.</p>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-violet-400">
                  <Zap className="h-4 w-4" />
                  Yosys Gate-Level Synthesis
                </h4>
                <div className="space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>• Synthesizes RTL designs into standard gate-level cells (AND, OR, XOR, DFF) and displays cell counts and netlists.</p>
                  <p>• Run synthesis directly from the toolbar or the Gate Synthesis tab.</p>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-foreground">
                  <Keyboard className="h-4 w-4" />
                  Shortcuts
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-background rounded border border-border/40">
                      <span className="text-muted-foreground">{shortcut.action}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, j) => (
                          <kbd key={j} className="px-1.5 py-0.5 bg-muted/40 rounded text-[10px] font-mono text-foreground">
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
      </div>

      {/* New Project Dialog Modal */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent className="sm:max-w-[440px] w-[95vw] sm:w-full bg-card border-border/80 text-foreground">
          <DialogHeader>
            <DialogTitle>Create New EDA Project</DialogTitle>
            <DialogDescription>
              Choose from Verilog, SystemVerilog, or Python verification starter templates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs">Project Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. FIFO_Controller"
                autoFocus
                className="bg-background border-border/60 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs">Description (optional)</Label>
              <Textarea
                id="description"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Description of target architecture..."
                rows={2}
                className="bg-background border-border/60 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-background border-border/60 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border/80 text-xs">
                  {PROJECT_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-[10px] text-muted-foreground">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsNewProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={createProject}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
