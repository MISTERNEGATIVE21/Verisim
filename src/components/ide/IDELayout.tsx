'use client';

import { VSCodiumTitlebar } from './VSCodiumTitlebar';
import { CommandPalette } from './CommandPalette';
import { ActivityBar } from './ActivityBar';
import { FileExplorer } from './FileExplorer';
import { SynthesisViewer } from './SynthesisViewer';
import { CodeEditor } from './CodeEditor';
import { IntegratedDock } from './IntegratedDock';
import { WaveformViewer } from './WaveformViewer';
import { AIAssistStudio } from './AIAssistStudio';
import { StatusBar } from './StatusBar';
import { WelcomeScreen } from './WelcomeScreen';
import { ToolchainModal } from './ToolchainModal';
import { useIDEStore } from '@/store/ide-store';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { runSimulation as tauriRunSimulation, saveProjectFile } from '@/lib/tauri-db';

export function IDELayout() {
  const {
    currentProject,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeActivityTab,
    setActiveActivityTab,
    isAiAssistOpen,
    dockCollapsed,
    setDockCollapsed,
    dockMaximized,
    waveformLayout,
    isSimulating,
    setSimulating,
    setSimulationResult,
    selectedEngine,
    setActiveDockTab,
    setIsNewProjectDialogOpen,
  } = useIDEStore();

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState<'files' | 'commands'>('files');

  const handleOpenCommandPalette = useCallback((mode: 'files' | 'commands' = 'files') => {
    setCommandPaletteMode(mode);
    setCommandPaletteOpen(true);
  }, []);

  const handleSaveProject = useCallback(async () => {
    if (!currentProject) return;
    try {
      await saveProjectFile(false);
      toast.success('Project saved');
    } catch (e) {
      console.error('Failed to save project:', e);
      toast.error('Failed to save project');
    }
  }, [currentProject]);

  const handleRunSimulation = useCallback(async () => {
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;

      if (isMeta) {
        const key = e.key.toLowerCase();

        // Ctrl+P / Ctrl+Shift+P -> Command Palette / File Quick Open
        if (key === 'p') {
          e.preventDefault();
          if (e.shiftKey) {
            setCommandPaletteMode('commands');
          } else {
            setCommandPaletteMode('files');
          }
          setCommandPaletteOpen(true);
          return;
        }

        // Ctrl+Shift+E -> View Explorer
        if (e.shiftKey && key === 'e') {
          e.preventDefault();
          setActiveActivityTab('files');
          setSidebarCollapsed(false);
          return;
        }

        // Ctrl+Shift+Y -> View RTL Gate Synthesis
        if (e.shiftKey && key === 'y') {
          e.preventDefault();
          setActiveActivityTab('synth');
          setSidebarCollapsed(false);
          return;
        }

        switch (key) {
          case 's':
            e.preventDefault();
            handleSaveProject();
            break;
          case 'enter':
            e.preventDefault();
            handleRunSimulation();
            break;
          case 'n':
            e.preventDefault();
            setIsNewProjectDialogOpen(true);
            break;
          case 'b':
            e.preventDefault();
            setSidebarCollapsed(!sidebarCollapsed);
            break;
          case 'j':
            e.preventDefault();
            setDockCollapsed(!dockCollapsed);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    sidebarCollapsed,
    dockCollapsed,
    handleSaveProject,
    handleRunSimulation,
    setActiveActivityTab,
    setSidebarCollapsed,
    setDockCollapsed,
    setIsNewProjectDialogOpen,
  ]);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setSidebarCollapsed]);

  if (!mounted) return null;

  // Show welcome screen if no project is selected
  if (!currentProject) {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground select-none">
        <VSCodiumTitlebar onOpenCommandPalette={handleOpenCommandPalette} />
        <div className="flex-1 overflow-auto">
          <WelcomeScreen />
        </div>
        <StatusBar />
        <ToolchainModal />
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          mode={commandPaletteMode}
          onSaveProject={handleSaveProject}
          onRunSimulation={handleRunSimulation}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden select-none">
      <VSCodiumTitlebar onOpenCommandPalette={handleOpenCommandPalette} />

      <div className="flex-1 flex relative overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobile && !sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* VS Code Style Activity Bar */}
        <ActivityBar />

        {/* Sidebar Drawer */}
        <div
          className={cn(
            'bg-card border-r border-border/70 transition-all duration-300 z-40 flex flex-col',
            isMobile ? 'fixed inset-y-0 left-12 w-72 translate-x-0' : 'relative flex-shrink-0',
            sidebarCollapsed && isMobile ? '-translate-x-full' : '',
            sidebarCollapsed && !isMobile
              ? 'w-0 overflow-hidden border-none'
              : activeActivityTab === 'synth'
              ? 'w-80'
              : 'w-64'
          )}
        >
          {isMobile && (
            <div className="p-2 border-b border-border flex justify-between items-center bg-muted/30">
              <span className="font-bold text-xs">
                {activeActivityTab === 'files' && 'Project Explorer'}
                {activeActivityTab === 'synth' && 'RTL Gate Synthesis'}
                {activeActivityTab === 'ai' && 'HDL Assistant Studio'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(true)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {activeActivityTab === 'files' && <FileExplorer />}
            {activeActivityTab === 'synth' && <SynthesisViewer variant="drawer" />}
            {activeActivityTab === 'ai' && <AIAssistStudio drawerMode={true} />}
          </div>
        </div>

        {/* Toggle Button for Mobile */}
        {isMobile && sidebarCollapsed && (
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-8 left-16 z-50 rounded-full shadow-xl h-10 w-10 border-blue-500/50 bg-card"
            onClick={() => setSidebarCollapsed(false)}
          >
            <Menu className="h-5 w-5 text-blue-400" />
          </Button>
        )}

        {/* Main Workstation Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {isMobile ? (
            <div className="flex-1 flex flex-col overflow-auto no-scrollbar">
              <div className="min-h-[400px] flex-shrink-0 border-b border-border/60">
                <CodeEditor />
              </div>
              <div className="min-h-[350px] flex-shrink-0">
                <IntegratedDock />
              </div>
            </div>
          ) : (
            <PanelGroup direction="vertical">
              {/* Upper Section: Code Editor (+ Side-by-Side Waveform) + Right AI Studio */}
              <Panel defaultSize={dockMaximized ? 20 : dockCollapsed ? 95 : 62} minSize={15}>
                <div className="h-full flex relative overflow-hidden">
                  <div className="flex-1 h-full min-w-0">
                    {waveformLayout === 'side-by-side' ? (
                      <PanelGroup direction="horizontal">
                        <Panel defaultSize={52} minSize={25}>
                          <CodeEditor />
                        </Panel>
                        <PanelResizeHandle className="w-1 bg-border/40 hover:bg-blue-500/60 transition-colors cursor-col-resize" />
                        <Panel defaultSize={48} minSize={25}>
                          <WaveformViewer />
                        </Panel>
                      </PanelGroup>
                    ) : (
                      <CodeEditor />
                    )}
                  </div>
                  {isAiAssistOpen && activeActivityTab !== 'ai' && <AIAssistStudio />}
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-border/40 hover:bg-blue-500/60 transition-colors cursor-row-resize" />

              {/* Lower Section: Integrated Bottom Dock */}
              <Panel defaultSize={dockMaximized ? 80 : dockCollapsed ? 5 : 38} minSize={5}>
                <IntegratedDock />
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>

      {/* Global Status Bar */}
      <StatusBar />
      <ToolchainModal />

      {/* Command Palette / Quick Open */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        mode={commandPaletteMode}
        onSaveProject={handleSaveProject}
        onRunSimulation={handleRunSimulation}
      />
    </div>
  );
}
