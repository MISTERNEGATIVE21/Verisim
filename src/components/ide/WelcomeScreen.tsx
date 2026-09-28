'use client';

import { Cpu, FileCode, Plus, FolderOpen, ExternalLink, Github, Heart, BookOpen, Clock, Sparkles, Play, Upload } from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';
import { openProjectFile, createNewProject, importVerilogFiles } from '@/lib/tauri-db';
import { toast } from 'sonner';
import { open as openUrl } from '@tauri-apps/plugin-shell';

export function WelcomeScreen() {
  const { setIsNewProjectDialogOpen } = useIDEStore();

  const handleOpenUrl = (url: string) => async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const launchDemo = (name: string, desc: string, template: string) => {
    try {
      createNewProject(name, desc, template);
      toast.success(`Loaded demo: ${name}`);
    } catch (err) {
      toast.error('Failed to launch demo');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background text-foreground p-8 overflow-y-auto">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/30 rounded-xl">
            <Cpu className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Verisim IDE</h1>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">All-in-One EDA Workstation</p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Integrated Digital Design environment powered by Icarus Verilog, Verilator, Python Verification, and Offline HDL Assist.
        </p>

        {/* Quick Launch Interactive Demos */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <FileCode className="h-3.5 w-3.5 text-blue-500" />
            <span>Interactive Demo Projects</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Demo 1: Verilog */}
            <div 
              onClick={() => launchDemo('Counter_Waveform_Demo', '4-bit synchronous counter with VCD waveform dump', 'basic')}
              className="p-3 rounded-lg border border-blue-500/30 bg-card hover:bg-blue-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-400">Verilog Classic</span>
                <Play className="h-3 w-3 text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-medium text-foreground">4-bit Counter</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Testbench & VCD Waveform view</p>
            </div>

            {/* Demo 2: SystemVerilog */}
            <div 
              onClick={() => launchDemo('SV_FIFO_Demo', 'Parameterized synchronous FIFO with SVA assertion', 'systemverilog_fifo')}
              className="p-3 rounded-lg border border-purple-500/30 bg-card hover:bg-purple-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-400">SystemVerilog</span>
                <Play className="h-3 w-3 text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-medium text-foreground">Sync FIFO Queue</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">always_ff, logic & Assertions</p>
            </div>

            {/* Demo 3: Python Verification */}
            <div 
              onClick={() => launchDemo('ALU_Python_Demo', '8-bit ALU with Python stimulus generator and checker', 'python_verification')}
              className="p-3 rounded-lg border border-amber-500/30 bg-card hover:bg-amber-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-400">Python Hub</span>
                <Play className="h-3 w-3 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-medium text-foreground">ALU Verification</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Golden model check & test vectors</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 pt-1">
          <div 
            onClick={() => setIsNewProjectDialogOpen(true)}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <Plus className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">New Custom Project</p>
              <p className="text-xs text-muted-foreground">Create a blank project or start from any HDL template</p>
            </div>
          </div>

          <div 
            onClick={openProjectFile}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <FolderOpen className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Open Verilog or Project File</p>
              <p className="text-xs text-muted-foreground">Load .v, .sv, or .vsm workspace files directly from your filesystem</p>
            </div>
          </div>

          <div 
            onClick={importVerilogFiles}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <Upload className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Import Verilog / SystemVerilog Files</p>
              <p className="text-xs text-muted-foreground">Select multiple .v and .sv files to bundle into an instant project</p>
            </div>
          </div>
        </div>

        {/* Study Resources */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            EDA Reference & Guides
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.chipverify.com/verilog/verilog-tutorial"
              onClick={handleOpenUrl("https://www.chipverify.com/verilog/verilog-tutorial")}
              className="flex items-center gap-2 p-2 rounded-md border border-border/60 bg-card text-xs hover:bg-muted/60 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-400 shrink-0" />
              <span className="truncate">Verilog / SV Tutorial</span>
            </a>
            <a
              href="https://verilator.org/guide/latest/"
              onClick={handleOpenUrl("https://verilator.org/guide/latest/")}
              className="flex items-center gap-2 p-2 rounded-md border border-border/60 bg-card text-xs hover:bg-muted/60 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-400 shrink-0" />
              <span className="truncate">Verilator Manual</span>
            </a>
            <a
              href="https://docs.cocotb.org/en/stable/"
              onClick={handleOpenUrl("https://docs.cocotb.org/en/stable/")}
              className="flex items-center gap-2 p-2 rounded-md border border-border/60 bg-card text-xs hover:bg-muted/60 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="truncate">Cocotb Python Verification</span>
            </a>
            <a
              href="https://steveicarus.github.io/iverilog/"
              onClick={handleOpenUrl("https://steveicarus.github.io/iverilog/")}
              className="flex items-center gap-2 p-2 rounded-md border border-border/60 bg-card text-xs hover:bg-muted/60 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-blue-400 shrink-0" />
              <span className="truncate">Icarus Verilog Docs</span>
            </a>
          </div>
        </div>

        {/* Footer: GitHub + Credits */}
        <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <a
            href="https://github.com/MISTERNEGATIVE21/Verisim"
            onClick={handleOpenUrl("https://github.com/MISTERNEGATIVE21/Verisim")}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
          
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>v6.0.1 (All-in-One)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>By <a href="https://github.com/MISTERNEGATIVE21" onClick={handleOpenUrl("https://github.com/MISTERNEGATIVE21")} className="hover:text-foreground transition-colors font-medium">MISTERNEGATIVE21</a></span>
          </div>
        </div>
      </div>
    </div>
  );
}
