'use client';

import { useIDEStore, ActivityTab } from '@/store/ide-store';
import { Files, Zap, Activity, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: ActivityTab;
  label: string;
  icon: typeof Files;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { id: 'files', label: 'Explorer', icon: Files, shortcut: 'Ctrl+Shift+E' },
  { id: 'synth', label: 'RTL Gate Synthesis', icon: Zap, shortcut: 'Ctrl+Shift+Y' },
  { id: 'waveform', label: 'Waveform Traces', icon: Activity, shortcut: 'Ctrl+Shift+W' },
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
      className="w-12 min-w-[48px] max-w-[48px] flex-shrink-0 bg-[#181818] border-r border-[#2b2b2b] flex flex-col justify-between items-center z-40 select-none"
      aria-label="Activity Bar"
    >
      {/* Primary Navigation Icons */}
      <div className="flex flex-col items-center w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'waveform'
              ? activeDockTab === 'waveform' && !dockCollapsed
              : activeActivityTab === item.id && !sidebarCollapsed;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                'w-12 h-12 flex items-center justify-center relative transition-colors group cursor-pointer focus:outline-none',
                isActive
                  ? 'text-white'
                  : 'text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2a2d2e]'
              )}
              title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ''}`}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              {/* Solid 2px left indicator accent bar in active state */}
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#0078d4]" />
              )}

              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-150 group-hover:scale-105',
                  isActive ? 'text-white' : 'text-[#858585] group-hover:text-white'
                )}
              />

              {/* Synthesis Indicator Badge */}
              {item.id === 'synth' && isSynthesizing && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              )}
              {item.id === 'synth' && synthesisResult && !isSynthesizing && (
                <span
                  className={cn(
                    'absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full',
                    synthesisResult.success ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom EDA Toolchain Settings Button */}
      <div className="flex flex-col items-center w-full mb-1">
        <button
          onClick={() => setIsToolchainModalOpen(true)}
          className="w-12 h-12 flex items-center justify-center relative transition-colors group cursor-pointer text-[#858585] hover:text-white hover:bg-[#2a2d2e] focus:outline-none"
          title="EDA Toolchain & Compilation Settings"
          aria-label="EDA Toolchain Settings"
        >
          <Settings className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45" />

          {/* Toolchain Health Status Dot */}
          {toolchainHealth && (
            <span
              className={cn(
                'absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-2 ring-[#181818]',
                toolchainHealth.verilator.found &&
                  toolchainHealth.iverilog.found &&
                  toolchainHealth.yosys.found
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              )}
            />
          )}
        </button>
      </div>
    </aside>
  );
}
