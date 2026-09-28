'use client';

import { useIDEStore, ActivityTab } from '@/store/ide-store';
import { Files, Zap, Activity, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: ActivityTab;
  label: string;
  icon: typeof Files;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { id: 'files', label: 'Explorer', icon: Files, shortcut: 'Ctrl+Shift+E' },
  { id: 'synth', label: 'RTL Gate Synthesis', icon: Zap },
  { id: 'waveform', label: 'Waveform Traces', icon: Activity },
  { id: 'ai', label: 'HDL Assistant Studio', icon: Sparkles },
];

export function ActivityBar() {
  const {
    activeActivityTab,
    setActiveActivityTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeDockTab,
    setActiveDockTab,
    dockCollapsed,
    setDockCollapsed,
    synthesisResult,
    isSynthesizing,
    toolchainHealth,
    setIsToolchainModalOpen,
  } = useIDEStore();

  const handleTabClick = (tabId: ActivityTab) => {
    if (tabId === 'waveform') {
      // Waveform is primarily in the Dock
      if (activeDockTab === 'waveform' && !dockCollapsed) {
        setDockCollapsed(true);
      } else {
        setActiveDockTab('waveform');
        setDockCollapsed(false);
      }
      return;
    }

    if (activeActivityTab === tabId) {
      // Toggle sidebar if already active
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      setActiveActivityTab(tabId);
      setSidebarCollapsed(false);
    }
  };

  return (
    <aside
      className="w-12 flex-shrink-0 bg-card/90 backdrop-blur border-r border-border/70 flex flex-col justify-between items-center py-2 z-40 select-none"
      aria-label="Activity Bar"
    >
      {/* Primary Navigation Icons */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'waveform'
              ? activeDockTab === 'waveform' && !dockCollapsed
              : activeActivityTab === item.id && !sidebarCollapsed;

          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  'h-10 w-10 rounded-lg transition-all relative',
                  isActive
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ''}`}
              >
                <Icon className={cn('h-5 w-5 transition-transform group-hover:scale-105', isActive && 'text-blue-500')} />
                
                {/* Active Indicator Bar on Left */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-500 rounded-r" />
                )}

                {/* Synthesis Indicator Badge */}
                {item.id === 'synth' && isSynthesizing && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                )}
                {item.id === 'synth' && synthesisResult && !isSynthesizing && (
                  <span
                    className={cn(
                      'absolute top-1 right-1 w-1.5 h-1.5 rounded-full',
                      synthesisResult.success ? 'bg-emerald-500' : 'bg-red-500'
                    )}
                  />
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Bottom EDA Toolchain Settings Button */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="relative group w-full flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsToolchainModalOpen(true)}
            className="h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all relative"
            title="EDA Toolchain & Compilation Settings"
          >
            <Settings className="h-5 w-5 transition-transform group-hover:rotate-45 duration-300" />
            
            {/* Status dot */}
            {toolchainHealth && (
              <span
                className={cn(
                  "absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-card",
                  toolchainHealth.verilator.found && toolchainHealth.iverilog.found && toolchainHealth.yosys.found
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                )}
              />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
