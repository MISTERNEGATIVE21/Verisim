import { create } from 'zustand';

export interface VerilogFile {
  id: string;
  name: string;
  content: string;
  type: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  files: VerilogFile[];
}

export interface SimulationResult {
  success: boolean;
  output: string;
  vcdContent?: string;
  mock?: boolean;
  error?: string;
  message?: string;
  installationGuide?: string;
}

export type SimulationEngine = 'iverilog' | 'verilator' | 'both';
export type DockTab = 'console' | 'python' | 'waveform';

export interface PythonResult {
  success: boolean;
  output: string;
  exit_code: number;
}

interface IDEState {
  // Projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  
  // Current active project
  currentProject: Project | null;
  projectPath: string | null;
  setCurrentProject: (project: Project | null, path?: string | null) => void;
  setProjectFiles: (files: VerilogFile[]) => void;

  // Files
  activeFile: VerilogFile | null;
  openFiles: VerilogFile[];
  setActiveFile: (file: VerilogFile | null) => void;
  openFile: (file: VerilogFile) => void;
  closeFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;

  // Simulation & Engine
  selectedEngine: SimulationEngine;
  setSelectedEngine: (engine: SimulationEngine) => void;
  isSimulating: boolean;
  simulationResult: SimulationResult | null;
  setSimulating: (simulating: boolean) => void;
  setSimulationResult: (result: SimulationResult | null) => void;

  // Python Verification Hub
  pythonResult: PythonResult | null;
  isPythonRunning: boolean;
  setPythonRunning: (running: boolean) => void;
  setPythonResult: (result: PythonResult | null) => void;

  // Editor features & AI
  autoSuggestEnabled: boolean;
  setAutoSuggestEnabled: (enabled: boolean) => void;
  toggleAutoSuggest: () => void;
  highlightPrimitives: boolean;
  setHighlightPrimitives: (enabled: boolean) => void;
  toggleHighlightPrimitives: () => void;
  highlightSystemTasks: boolean;
  setHighlightSystemTasks: (enabled: boolean) => void;
  toggleHighlightSystemTasks: () => void;

  // UI State & All-in-One Docking
  showWaveform: boolean;
  setShowWaveform: (show: boolean) => void;
  activeDockTab: DockTab;
  setActiveDockTab: (tab: DockTab) => void;
  dockCollapsed: boolean;
  setDockCollapsed: (collapsed: boolean) => void;
  dockMaximized: boolean;
  setDockMaximized: (maximized: boolean) => void;
  isAiAssistOpen: boolean;
  setIsAiAssistOpen: (open: boolean) => void;
  toggleAiAssist: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isNewProjectDialogOpen: boolean;
  setIsNewProjectDialogOpen: (open: boolean) => void;
}

export const useIDEStore = create<IDEState>((set, get) => ({
  // Projects
  projects: [],
  setProjects: (projects) => set({ projects }),
  
  // Current active project
  currentProject: null,
  projectPath: null,
  setCurrentProject: (project, path = null) => 
    set({ currentProject: project, projectPath: path, openFiles: [], activeFile: null }),
  setProjectFiles: (files) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, files, updated_at: new Date().toISOString() } : null
  })),

  // Files
  activeFile: null,
  openFiles: [],
  setActiveFile: (file) => set({ activeFile: file }),
  openFile: (file) => {
    const { openFiles } = get();
    if (!openFiles.find((f) => f.id === file.id)) {
      set({ openFiles: [...openFiles, file], activeFile: file });
    } else {
      set({ activeFile: file });
    }
  },
  closeFile: (fileId) => {
    const { openFiles, activeFile } = get();
    const newOpenFiles = openFiles.filter((f) => f.id !== fileId);
    const newActiveFile = activeFile?.id === fileId 
      ? newOpenFiles[newOpenFiles.length - 1] || null 
      : activeFile;
    set({ openFiles: newOpenFiles, activeFile: newActiveFile });
  },
  updateFileContent: (fileId, content) => {
    const { openFiles, activeFile, currentProject } = get();
    const updatedFiles = openFiles.map((f) => 
      f.id === fileId ? { ...f, content } : f
    );
    const updatedActiveFile = activeFile?.id === fileId 
      ? { ...activeFile, content } 
      : activeFile;
    
    // Also update in project files
    const updatedProject = currentProject ? {
      ...currentProject,
      files: currentProject.files.map((f) => 
        f.id === fileId ? { ...f, content } : f
      ),
    } : null;
    
    set({ 
      openFiles: updatedFiles, 
      activeFile: updatedActiveFile,
      currentProject: updatedProject,
    });
  },

  // Simulation & Engine
  selectedEngine: 'iverilog',
  setSelectedEngine: (engine) => set({ selectedEngine: engine }),
  isSimulating: false,
  simulationResult: null,
  setSimulating: (simulating) => set({ isSimulating: simulating }),
  setSimulationResult: (result) => set({ simulationResult: result }),

  // Python Verification Hub
  pythonResult: null,
  isPythonRunning: false,
  setPythonRunning: (running) => set({ isPythonRunning: running }),
  setPythonResult: (result) => set({ pythonResult: result }),

  // Editor features & AI
  autoSuggestEnabled: true,
  setAutoSuggestEnabled: (enabled) => set({ autoSuggestEnabled: enabled }),
  toggleAutoSuggest: () => set((state) => ({ autoSuggestEnabled: !state.autoSuggestEnabled })),
  highlightPrimitives: true,
  setHighlightPrimitives: (enabled) => set({ highlightPrimitives: enabled }),
  toggleHighlightPrimitives: () => set((state) => ({ highlightPrimitives: !state.highlightPrimitives })),
  highlightSystemTasks: true,
  setHighlightSystemTasks: (enabled) => set({ highlightSystemTasks: enabled }),
  toggleHighlightSystemTasks: () => set((state) => ({ highlightSystemTasks: !state.highlightSystemTasks })),

  // UI State & All-in-One Docking
  showWaveform: true,
  setShowWaveform: (show) => set({ showWaveform: show }),
  activeDockTab: 'console',
  setActiveDockTab: (tab) => set({ activeDockTab: tab, dockCollapsed: false }),
  dockCollapsed: false,
  setDockCollapsed: (collapsed) => set({ dockCollapsed: collapsed }),
  dockMaximized: false,
  setDockMaximized: (maximized) => set({ dockMaximized: maximized }),
  isAiAssistOpen: false,
  setIsAiAssistOpen: (open) => set({ isAiAssistOpen: open }),
  toggleAiAssist: () => set((state) => ({ isAiAssistOpen: !state.isAiAssistOpen })),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  isNewProjectDialogOpen: false,
  setIsNewProjectDialogOpen: (open) => set({ isNewProjectDialogOpen: open }),
}));
