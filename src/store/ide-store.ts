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

interface IDEState {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;

  // Files
  activeFile: VerilogFile | null;
  openFiles: VerilogFile[];
  setActiveFile: (file: VerilogFile | null) => void;
  openFile: (file: VerilogFile) => void;
  closeFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;

  // Simulation
  isSimulating: boolean;
  simulationResult: SimulationResult | null;
  setSimulating: (simulating: boolean) => void;
  setSimulationResult: (result: SimulationResult | null) => void;

  // UI State
  showWaveform: boolean;
  setShowWaveform: (show: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useIDEStore = create<IDEState>((set, get) => ({
  // Projects
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project, openFiles: [], activeFile: null }),

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

  // Simulation
  isSimulating: false,
  simulationResult: null,
  setSimulating: (simulating) => set({ isSimulating: simulating }),
  setSimulationResult: (result) => set({ simulationResult: result }),

  // UI State
  showWaveform: false,
  setShowWaveform: (show) => set({ showWaveform: show }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
