'use client';

import { useIDEStore, SimulationEngine } from '@/store/ide-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Plus, 
  Save,
  Loader2,
  Activity,
  Code2,
  BookOpen,
  Keyboard,
  Terminal,
  FileCode,
  Zap,
  ExternalLink,
  Download,
  Monitor,
  Cpu,
  Wand2,
  Columns2,
  Trash2,
  FolderOpen,
  Sparkles,
  Settings2,
  Check
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
  runPythonScript
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
    projects, 
    setProjects,
    setCurrentProject,
    isSimulating, 
    setSimulating,
    setSimulationResult,
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

  const runSimulation = useCallback(async () => {
    if (!currentProject || isSimulating) return;
    
    setSimulating(true);
    setSimulationResult(null);
    setActiveDockTab('console');
    
    try {
      const result = await tauriRunSimulation(currentProject.id, currentProject.files, selectedEngine);
      setSimulationResult(result as any);
      if (result.success) {
        toast.success(`${selectedEngine === 'verilator' ? 'Verilator Lint' : 'Simulation'} finished successfully`);
      } else {
        toast.error('Simulation finished with diagnostics/errors');
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      setSimulationResult({
        success: false,
        output: 'Failed to run simulation. Please check your toolchain installation.',
        error: 'Execution error',
      });
      toast.error('Simulation execution failed');
    } finally {
      setSimulating(false);
    }
  }, [currentProject, isSimulating, selectedEngine, setSimulating, setSimulationResult, setActiveDockTab]);

  const handleRunPython = useCallback(async () => {
    if (!currentProject || isPythonRunning) return;

    // Pick target python script
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
  }, [currentProject, activeFile, isPythonRunning, setPythonRunning, setPythonResult, setActiveDockTab]);

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
    if (!newProjectName.trim()) return;
    
    try {
      createNewProject(newProjectName, newProjectDesc, selectedTemplate);
      setIsNewProjectDialogOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setSimulationResult(null);
      setPythonResult(null);
      toast.success(`Created project "${newProjectName}"`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
    }
  };

  const closeProject = () => {
    setCurrentProject(null);
    setSimulationResult(null);
    setPythonResult(null);
  };

  const hasPython = currentProject?.files.some(f => f.name.endsWith('.py')) || false;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-3 py-1.5 gap-2 border-b border-border/70 bg-card text-foreground select-none">
      {/* Left Section - Logo and Project Selection */}
      <div className="flex items-center justify-between w-full md:w-auto gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-blue-600/10 border border-blue-500/40 flex items-center justify-center">
            <Code2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm tracking-tight text-foreground">Verisim</span>
            <Badge variant="outline" className="text-[10px] font-semibold py-0 px-1 text-blue-400 border-blue-500/30">
              All-in-One
            </Badge>
          </div>
        </div>
        
        {currentProject && (
          <div className="flex items-center gap-2 pl-2 border-l border-border/50">
            <span className="text-xs font-medium text-foreground truncate max-w-[130px]">
              {currentProject.name}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={closeProject}
              title="Close Project"
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Center Section - Engine, Run Buttons, and Modes */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar py-0.5">
        {/* New Project Dialog */}
        <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0 border-border/60">
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>New</span>
            </Button>
          </DialogTrigger>
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
              <Button variant="ghost" size="sm" onClick={() => setIsNewProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={createProject}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Project Button */}
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

        <div className="h-4 w-[1px] bg-border/40 mx-1 hidden sm:block" />

        {/* Engine Selector */}
        <Select 
          value={selectedEngine} 
          onValueChange={(val) => setSelectedEngine(val as SimulationEngine)}
        >
          <SelectTrigger className="h-7 text-xs w-[145px] shrink-0 bg-background border-border/60 font-medium">
            <Cpu className="h-3.5 w-3.5 mr-1 text-blue-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border/80 text-xs">
            <SelectItem value="iverilog">Icarus (-g2012)</SelectItem>
            <SelectItem value="verilator">Verilator Lint</SelectItem>
          </SelectContent>
        </Select>

        {/* Run Simulation Button */}
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-medium shadow-sm"
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
              <span>{selectedEngine === 'verilator' ? 'Lint' : 'Simulate'}</span>
            </>
          )}
        </Button>

        {/* Run Python Button */}
        {currentProject && (
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "h-7 px-2 text-xs shrink-0 font-medium border-border/60",
              hasPython ? "text-amber-400 border-amber-500/30 hover:bg-amber-500/10" : "opacity-60"
            )}
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

        <div className="h-4 w-[1px] bg-border/40 mx-1 hidden sm:block" />

        {/* Waveform Layout Toggle (Side-by-Side vs Dock) */}
        {currentProject && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs shrink-0 border-border/60",
              waveformLayout === 'side-by-side' ? "bg-blue-500/10 text-blue-500 border-blue-500/30" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={toggleWaveformLayout}
            title="Toggle Side-by-Side Waveform Split (Ctrl+Alt+W)"
          >
            <Columns2 className="h-3.5 w-3.5 mr-1 text-blue-500" />
            <span className="hidden sm:inline">{waveformLayout === 'side-by-side' ? 'Side Waveform' : 'Dock Waveform'}</span>
          </Button>
        )}

        {/* Code Suggestions Pill Toggle */}
        <button
          onClick={toggleAutoSuggest}
          className={cn(
            "flex items-center gap-1.5 h-7 px-2 rounded border text-xs font-medium shrink-0 transition-colors",
            autoSuggestEnabled 
              ? "bg-blue-500/10 text-blue-500 border-blue-500/40 hover:bg-blue-500/20" 
              : "bg-muted/20 text-muted-foreground border-border/40 hover:bg-muted/40"
          )}
          title="Toggle Code Snippets (Alt+A)"
        >
          <Zap className="h-3 w-3 text-amber-500" />
          <span className="hidden sm:inline">Assist:</span>
          <span>{autoSuggestEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* HDL Design Assistant Trigger */}
        <Button
          variant={isAiAssistOpen ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-7 px-2 text-xs shrink-0 border-border/60",
            isAiAssistOpen ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:text-blue-500"
          )}
          onClick={toggleAiAssist}
          title="Toggle HDL Design & Testbench Assistant"
        >
          <Wand2 className="h-3.5 w-3.5 mr-1 text-blue-500" />
          <span className="hidden sm:inline">HDL Assistant</span>
        </Button>
      </div>

      {/* Right Section - Settings & Documentation */}
      <div className="flex items-center gap-1.5 md:ml-auto">
        {/* Syntax Highlight Settings Dropdown */}
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

        <ThemeToggle />

        {/* Documentation Dialog */}
        <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0 text-muted-foreground hover:text-foreground">
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              <span>Docs</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto bg-card border-border/80 text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-400" />
                Verisim All-in-One IDE Manual
              </DialogTitle>
              <DialogDescription>
                SystemVerilog, Icarus, Verilator, Python verification, and offline AI write assist guide.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5 py-3 text-xs">
              <section>
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-blue-400">
                  <Cpu className="h-4 w-4" />
                  Dual-Engine Simulation & Linting
                </h4>
                <div className="space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>• <strong>Icarus Verilog:</strong> Simulates Verilog and SystemVerilog with full IEEE 1800-2012 flag (`-g2012`) and generates standard `.vcd` waveform dumps.</p>
                  <p>• <strong>Verilator:</strong> Performs high-speed cycle-accurate linting and static analysis, flagging inferred latches and bit-width mismatches.</p>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-amber-400">
                  <span className="text-sm">🐍</span>
                  Python Verification Hub
                </h4>
                <div className="space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>• Execute Python 3 test vector generators and output checkers directly inside your project.</p>
                  <p>• Generate `.hex` / `.mem` stimulus loaded via `$readmemh` into HDL testbenches.</p>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5 text-purple-400">
                  <Sparkles className="h-4 w-4" />
                  Offline AI Write Assist & Auto-Suggestions
                </h4>
                <div className="space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>• <strong>Instant Testbench Generator:</strong> Automatically inspects module ports and creates a full testbench with clocks, resets, and stimulus.</p>
                  <p>• <strong>Auto-Suggest Mode (Alt+A):</strong> Monaco intelligent inline completions for `always_ff`, `always_comb`, `$dumpfile`, and module instantiation.</p>
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
    </div>
  );
}
