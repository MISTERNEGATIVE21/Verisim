'use client';

import { Toolbar } from './Toolbar';
import { ActivityBar } from './ActivityBar';
import { FileExplorer } from './FileExplorer';
import { SynthesisViewer } from './SynthesisViewer';
import { CodeEditor } from './CodeEditor';
import { IntegratedDock } from './IntegratedDock';
import { WaveformViewer } from './WaveformViewer';
import { AIAssistStudio } from './AIAssistStudio';
import { StatusBar } from './StatusBar';
import { WelcomeScreen } from './WelcomeScreen';
import { useIDEStore } from '@/store/ide-store';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IDELayout() {
  const { 
    currentProject, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    activeActivityTab,
    isAiAssistOpen,
    dockCollapsed,
    dockMaximized,
    waveformLayout
  } = useIDEStore();

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        <Toolbar />
        <div className="flex-1 overflow-auto">
          <WelcomeScreen />
        </div>
        <StatusBar />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden select-none">
      <Toolbar />
      
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
        <div className={cn(
          "bg-card border-r border-border/70 transition-all duration-300 z-40 flex flex-col",
          isMobile ? "fixed inset-y-0 left-12 w-72 translate-x-0" : "relative flex-shrink-0",
          sidebarCollapsed && isMobile ? "-translate-x-full" : "",
          sidebarCollapsed && !isMobile ? "w-0 overflow-hidden border-none" : (activeActivityTab === 'synth' ? "w-80" : "w-64")
        )}>
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
              <Panel defaultSize={dockMaximized ? 20 : (dockCollapsed ? 95 : 62)} minSize={15}>
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
                  {isAiAssistOpen && activeActivityTab !== 'ai' && (
                    <AIAssistStudio />
                  )}
                </div>
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-border/40 hover:bg-blue-500/60 transition-colors cursor-row-resize" />
              
              {/* Lower Section: Integrated Bottom Dock */}
              <Panel defaultSize={dockMaximized ? 80 : (dockCollapsed ? 5 : 38)} minSize={5}>
                <IntegratedDock />
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>

      {/* Global Status Bar */}
      <StatusBar />
    </div>
  );
}
