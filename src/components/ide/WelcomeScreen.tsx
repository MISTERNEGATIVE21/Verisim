'use client';

import { Cpu, FileCode, Plus, FolderOpen, ExternalLink, Github, Heart, BookOpen, Clock } from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';
import { openProjectFile } from '@/lib/tauri-db';

export function WelcomeScreen() {
  const { setIsNewProjectDialogOpen } = useIDEStore();

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background p-8">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="p-2 bg-muted rounded-xl">
            <Cpu className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Verisim IDE</h1>
        </div>

        <p className="text-center text-muted-foreground">
          Verilog development environment with Icarus Verilog simulation and waveform viewing.
        </p>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div 
            onClick={() => setIsNewProjectDialogOpen(true)}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <Plus className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">New Project</p>
              <p className="text-xs text-muted-foreground">Create a project from scratch or use a template</p>
            </div>
          </div>

          <div 
            onClick={openProjectFile}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <FolderOpen className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">Open Project</p>
              <p className="text-xs text-muted-foreground">Load a .vsm file from your system</p>
            </div>
          </div>
        </div>

        {/* Study Resources */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Learn Verilog
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.chipverify.com/verilog/verilog-tutorial"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="truncate">Verilog Tutorial</span>
            </a>
            <a
              href="https://hdlbits.01xz.net/wiki/Main_Page"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="truncate">HDLBits Practice</span>
            </a>
            <a
              href="https://www.asic-world.com/verilog/veritut.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="truncate">ASIC World</span>
            </a>
            <a
              href="https://steveicarus.github.io/iverilog/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="truncate">Icarus Verilog Docs</span>
            </a>
          </div>
        </div>

        {/* Footer: GitHub + Credits */}
        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <a
            href="https://github.com/MISTERNEGATIVE21/Verisim"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
          
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>v1.0.0</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-red-500" />
            <span>by <a href="https://github.com/MISTERNEGATIVE21" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors font-medium">MISTERNEGATIVE21</a></span>
          </div>
        </div>
      </div>
    </div>
  );
}
