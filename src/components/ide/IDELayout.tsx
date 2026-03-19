'use client';

import { Toolbar } from './Toolbar';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { ConsoleOutput } from './ConsoleOutput';
import { WaveformViewer } from './WaveformViewer';
import { WelcomeScreen } from './WelcomeScreen';
import { useIDEStore } from '@/store/ide-store';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IDELayout() {
  const { currentProject, sidebarCollapsed, setSidebarCollapsed, showWaveform } = useIDEStore();
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
      <div className="h-screen flex flex-col bg-background">
        <Toolbar />
        <div className="flex-1 overflow-auto">
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Toolbar />
      
      <div className="flex-1 flex relative overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobile && !sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar - File Explorer */}
        <div className={cn(
          "bg-card border-r border-border transition-all duration-300 z-50",
          isMobile ? "fixed inset-y-0 left-0 w-64 translate-x-0" : "relative flex-shrink-0",
          sidebarCollapsed && isMobile ? "-translate-x-full" : "",
          sidebarCollapsed && !isMobile ? "w-0 overflow-hidden border-none" : "w-64"
        )}>
          {isMobile && (
            <div className="p-2 border-b border-border flex justify-between items-center bg-muted/50">
              <span className="font-bold text-sm">Navigation</span>
              <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(true)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <FileExplorer />
        </div>

        {/* Toggle Button for Mobile */}
        {isMobile && sidebarCollapsed && (
          <Button 
            variant="outline" 
            size="icon" 
            className="fixed bottom-4 left-4 z-50 rounded-full shadow-lg h-10 w-10 border-blue-500/50 bg-background"
            onClick={() => setSidebarCollapsed(false)}
          >
            <Menu className="h-5 w-5 text-blue-500" />
          </Button>
        )}
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {isMobile ? (
            <div className="flex-1 flex flex-col overflow-auto no-scrollbar">
              <div className="min-h-[400px] flex-shrink-0 border-b border-border">
                <CodeEditor />
              </div>
              {showWaveform && (
                <div className="min-h-[300px] flex-shrink-0 border-b border-border">
                  <WaveformViewer />
                </div>
              )}
              <div className="min-h-[300px] flex-shrink-0">
                <ConsoleOutput />
              </div>
            </div>
          ) : (
            <PanelGroup direction="vertical">
              {/* Editor */}
              <Panel defaultSize={showWaveform ? 40 : 60} minSize={20}>
                <CodeEditor />
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-border hover:bg-blue-500/50 transition-colors cursor-row-resize" />
              
              {/* Waveform Viewer (if shown) */}
              {showWaveform && (
                <>
                  <Panel defaultSize={30} minSize={15}>
                    <WaveformViewer />
                  </Panel>
                  <PanelResizeHandle className="h-1 bg-border hover:bg-blue-500/50 transition-colors cursor-row-resize" />
                </>
              )}
              
              {/* Console Output */}
              <Panel defaultSize={showWaveform ? 30 : 40} minSize={15}>
                <ConsoleOutput />
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>
    </div>
  );
}
