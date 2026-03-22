'use client';

import { useIDEStore } from '@/store/ide-store';
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
  Trash2,
  FolderOpen
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  fetchProjects as tauriFetchProjects, 
  createProject as tauriCreateProject, 
  deleteProject as tauriDeleteProject,
  updateFile as tauriUpdateFile,
  runSimulation as tauriRunSimulation
} from '@/lib/tauri-db';

const PROJECT_TEMPLATES = [
  { id: 'none', name: 'Empty Project', description: 'Start with a single blank Verilog file' },
  { id: 'basic', name: 'Counter (Basic)', description: '4-bit counter with testbench' },
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
    showWaveform,
    setShowWaveform,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeFile,
  } = useIDEStore();
  
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('none');
  const [saving, setSaving] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveFile();
            break;
          case 'enter':
            e.preventDefault();
            runSimulation();
            break;
          case 'n':
            e.preventDefault();
            setNewProjectOpen(true);
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
  }, [sidebarCollapsed, activeFile, currentProject, isSimulating]);

  const fetchProjects = async () => {
    try {
      const data = await tauriFetchProjects();
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim() || isCreatingProject) return;
    
    setIsCreatingProject(true);
    try {
      const project = await tauriCreateProject(newProjectName, newProjectDesc, selectedTemplate);
      
      if (!project) {
        throw new Error('Failed to create project');
      }

      await fetchProjects();
      setCurrentProject(project);
      setNewProjectOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project and all its files?')) return;
    
    try {
      await tauriDeleteProject(projectId);
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }
      await fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const selectProject = async (projectId: string) => {
    try {
      const projects = await tauriFetchProjects();
      const project = projects.find((p: { id: string }) => p.id === projectId);
      if (project) {
        setCurrentProject(project);
        setSimulationResult(null);
        setShowWaveform(false);
      }
    } catch (error) {
      console.error('Failed to select project:', error);
    }
  };

  const saveFile = useCallback(async () => {
    if (!activeFile) return;
    
    setSaving(true);
    try {
      await tauriUpdateFile(activeFile.id, activeFile.content);
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  }, [activeFile]);

  const runSimulation = useCallback(async () => {
    if (!currentProject || isSimulating) return;
    
    setSimulating(true);
    setSimulationResult(null);
    
    try {
      const result = await tauriRunSimulation(currentProject.id, currentProject.files);
      setSimulationResult(result as any);
    } catch (error) {
      console.error('Simulation failed:', error);
      setSimulationResult({
        success: false,
        output: 'Failed to run simulation. Please try again.',
        error: 'Connection error',
      });
    } finally {
      setSimulating(false);
    }
  }, [currentProject, isSimulating]);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-4 py-2 gap-2 border-b border-border bg-background">
      {/* Left Section - Logo and Project Selection */}
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg hidden sm:inline">Verisim</span>
          <Badge variant="secondary" className="text-xs">IDE</Badge>
        </div>
        
        {currentProject && (
          <div className="flex items-center gap-1">
            <Select value={currentProject.id} onValueChange={selectProject}>
              <SelectTrigger className="w-[150px] sm:w-[200px] h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(projects) && projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>

            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={() => deleteProject(currentProject.id)}
              title="Delete Project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Center Section - Actions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 max-w-full no-scrollbar">
        {/* New Project Dialog */}
        <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Choose a template or start from scratch.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Verilog Project"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="A brief description of your project..."
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col items-start text-left">
                          <span>{template.name}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
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
              <Button variant="outline" onClick={() => setNewProjectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createProject} disabled={!newProjectName.trim() || isCreatingProject}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Open Project Dialog */}
        <Dialog open={openProjectDialog} onOpenChange={setOpenProjectDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 shrink-0">
              <FolderOpen className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Open Project</span>
              <span className="sm:hidden">Open</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Open Project</DialogTitle>
              <DialogDescription>
                Select a project to continue working.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {!Array.isArray(projects) || projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects found. Create a new one!
                  </div>
                ) : (
                  projects.map((project) => (
                    <div 
                      key={project.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent group transition-colors cursor-pointer",
                        currentProject?.id === project.id && "bg-accent border-blue-500/50"
                      )}
                      onClick={() => {
                        selectProject(project.id);
                        setOpenProjectDialog(false);
                      }}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{project.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {project.description || 'No description'}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          Last updated: {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenProjectDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={saveFile}
          disabled={!activeFile || saving}
        >
          <Save className={cn("h-4 w-4 mr-1", saving && "text-green-500")} />
          <span className="hidden sm:inline">{saving ? 'Saved!' : 'Save'}</span>
        </Button>

        {/* Run Simulation Button */}
        <Button
          size="sm"
          className="h-8 bg-green-600 hover:bg-green-700 shrink-0"
          onClick={runSimulation}
          disabled={!currentProject || isSimulating}
        >
          {isSimulating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              <span className="hidden sm:inline">Running...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Run Simulation</span>
              <span className="sm:hidden">Run</span>
            </>
          )}
        </Button>
      </div>

      {/* Right Section - View Options */}
      <div className="flex items-center gap-2 md:ml-auto">
        <Button
          variant={showWaveform ? "default" : "outline"}
          size="sm"
          className="h-8 shrink-0"
          onClick={() => setShowWaveform(!showWaveform)}
          disabled={!currentProject}
        >
          <Activity className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Waveform</span>
        </Button>
        
        {/* Documentation Dialog */}
        <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 shrink-0">
              <BookOpen className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Docs</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Verisim IDE Documentation
              </DialogTitle>
              <DialogDescription>
                Learn how to use the Verisim IDE for digital logic design
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Getting Started */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Getting Started
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>1. Click <strong>New Project</strong> to create a new Verilog project</p>
                  <p>2. Select a template (Counter, MUX, ALU, or FSM)</p>
                  <p>3. Edit your Verilog code in the editor</p>
                  <p>4. Click <strong>Run Simulation</strong> to compile and test</p>
                  <p>5. View waveforms in the Waveform panel</p>
                </div>
              </section>

              {/* Keyboard Shortcuts */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-blue-500" />
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-2">
                  {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{shortcut.action}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, j) => (
                          <kbd key={j} className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Installing Icarus Verilog */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-green-500" />
                  Installing Icarus Verilog
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  To run real Verilog simulations, install Icarus Verilog on your system:
                </p>
                
                <Tabs defaultValue="ubuntu" className="w-full">
                  <TabsList className="grid grid-cols-4 h-9">
                    <TabsTrigger value="ubuntu" className="text-xs">
                      <Cpu className="h-3 w-3 mr-1" />
                      Ubuntu
                    </TabsTrigger>
                    <TabsTrigger value="arch" className="text-xs">
                      <Cpu className="h-3 w-3 mr-1" />
                      Arch
                    </TabsTrigger>
                    <TabsTrigger value="fedora" className="text-xs">
                      <Cpu className="h-3 w-3 mr-1" />
                      Fedora
                    </TabsTrigger>
                    <TabsTrigger value="macos" className="text-xs">
                      <Monitor className="h-3 w-3 mr-1" />
                      macOS
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="ubuntu" className="mt-3">
                    <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-2">
                      <div className="text-blue-500 font-semibold"># Ubuntu / Debian / Linux Mint / Pop!_OS</div>
                      <div>sudo apt-get update</div>
                      <div>sudo apt-get install iverilog</div>
                      <div className="mt-2 text-muted-foreground"># Verify installation:</div>
                      <div>iverilog -V</div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="arch" className="mt-3">
                    <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-2">
                      <div className="text-blue-500 font-semibold"># Arch Linux / Manjaro / EndeavourOS</div>
                      <div className="text-muted-foreground"># Using pacman:</div>
                      <div>sudo pacman -S iverilog</div>
                      <div className="mt-2 text-muted-foreground"># Or using yay (AUR):</div>
                      <div>yay -S iverilog</div>
                      <div className="mt-2 text-muted-foreground"># Or using paru:</div>
                      <div>paru -S iverilog</div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="fedora" className="mt-3">
                    <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-2">
                      <div className="text-blue-500 font-semibold"># Fedora / RHEL / CentOS / Rocky Linux</div>
                      <div>sudo dnf install iverilog</div>
                      <div className="mt-2 text-muted-foreground"># For RHEL/CentOS with EPEL:</div>
                      <div>sudo dnf install epel-release</div>
                      <div>sudo dnf install iverilog</div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="macos" className="mt-3">
                    <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-2">
                      <div className="text-blue-500 font-semibold"># macOS</div>
                      <div className="text-muted-foreground"># Using Homebrew:</div>
                      <div>brew install icarus-verilog</div>
                      <div className="mt-2 text-muted-foreground"># Using MacPorts:</div>
                      <div>sudo port install iverilog</div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Other Linux Distros */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Other Linux Distributions</h4>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-2">
                    <div><span className="text-blue-500"># openSUSE:</span> sudo zypper install iverilog</div>
                    <div><span className="text-blue-500"># Gentoo:</span> sudo emerge sci-electronics/iverilog</div>
                    <div><span className="text-blue-500"># Alpine:</span> sudo apk add iverilog</div>
                    <div><span className="text-blue-500"># Void Linux:</span> sudo xbps-install -S iverilog</div>
                    <div><span className="text-blue-500"># Solus:</span> sudo eopkg install iverilog</div>
                    <div><span className="text-blue-500"># NixOS:</span> nix-env -i iverilog</div>
                  </div>
                </div>

                {/* Auto Install Script */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-500" />
                    Auto-Install Script
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Run this script to automatically detect your OS and install Icarus Verilog:
                  </p>
                  <code className="block bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                    curl -fsSL https://raw.githubusercontent.com/MISTERNEGATIVE21/Verisim/main/scripts/install-iverilog.sh | bash
                  </code>
                </div>

                {/* Android */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-green-500" />
                    Android (Termux)
                  </h4>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-2">
                    <div className="text-blue-500 font-semibold"># Install Termux from F-Droid</div>
                    <div>pkg update && pkg upgrade</div>
                    <div>pkg install tmux iverilog</div>
                    <div className="mt-2 text-muted-foreground"># Start a tmux session (keeps simulation running):</div>
                    <div>tmux new -s sim</div>
                    <div className="mt-2 text-muted-foreground"># Verify installation:</div>
                    <div>iverilog -V</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    On Android, install <strong>Termux</strong> from F-Droid (not Google Play). 
                    Use <strong>tmux</strong> to keep simulation sessions alive in the background.
                  </p>
                </div>

                {/* Windows */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Windows
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>1. Download installer from: <a href="http://bleyer.org/icarus/" target="_blank" rel="noopener" className="text-blue-500 hover:underline">http://bleyer.org/icarus/</a></p>
                    <p>2. Run the installer and follow the prompts</p>
                    <p>3. Add Icarus Verilog to your PATH during installation</p>
                    <p className="text-xs mt-2">Alternatively, use WSL (Windows Subsystem for Linux) with Ubuntu</p>
                  </div>
                </div>
              </section>

              {/* Writing Testbenches */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-purple-500" />
                  Writing Testbenches
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>A testbench should include:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Signal declarations (reg for inputs, wire for outputs)</li>
                    <li>Module instantiation</li>
                    <li>Clock generation (if needed)</li>
                    <li>Test stimulus in an initial block</li>
                    <li>$dumpfile and $dumpvars for waveform generation</li>
                  </ul>
                </div>
              </section>

              {/* Links */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Resources</h3>
                <div className="space-y-2 text-sm">
                  <a 
                    href="https://steveicarus.github.io/iverilog/usage/install.html" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Icarus Verilog Official Documentation
                  </a>
                  <a 
                    href="https://iverilog.fandom.com/wiki/Icarus_Verilog_Wiki" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Icarus Verilog Wiki
                  </a>
                  <a 
                    href="https://www.chipverify.com/verilog/verilog-tutorial" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Verilog Tutorial (ChipVerify)
                  </a>
                  <a 
                    href="https://github.com/steveicarus/iverilog" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Icarus Verilog GitHub
                  </a>
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
