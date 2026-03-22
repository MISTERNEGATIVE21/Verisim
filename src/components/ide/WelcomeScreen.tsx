'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Code2, 
  Play, 
  Activity, 
  FileCode,
  Zap,
  GraduationCap,
  Keyboard,
  Cpu,
  Monitor,
  Command
} from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';

export function WelcomeScreen() {
  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] opacity-50 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="flex-1 overflow-y-auto px-4 py-12 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Cpu className="h-8 w-8 text-blue-500" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">VerilogSim IDE</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              A professional Verilog hardware description language environment. Design, simulate, and debug digital logic circuits natively on your machine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: Quick Actions */}
            <div className="md:col-span-5 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Start
              </h2>
              
              <div className="space-y-3">
                <Card className="bg-card w-full hover:bg-accent/50 transition-colors border-border/50">
                  <CardHeader className="p-4 flex flex-row items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileCode className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">New Project</CardTitle>
                      <CardDescription className="text-xs">Create a blank project or use a template</CardDescription>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="bg-card w-full hover:bg-accent/50 transition-colors border-border/50">
                  <CardHeader className="p-4 flex flex-row items-center gap-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Monitor className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Open Project</CardTitle>
                      <CardDescription className="text-xs">Load an existing project from your workspace</CardDescription>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="bg-card w-full hover:bg-accent/50 transition-colors border-border/50">
                  <CardHeader className="p-4 flex flex-row items-center gap-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Documentation</CardTitle>
                      <CardDescription className="text-xs">Learn how to wire testbenches and view waveforms</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              <div className="pt-4 border-t border-border/50">
                <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Shortcuts</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">New Project</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md border border-border text-xs font-mono flex items-center gap-1">
                      <Command className="h-3 w-3" /> N
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Run Simulation</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md border border-border text-xs font-mono flex items-center gap-1">
                      <Command className="h-3 w-3" /> Enter
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Toggle Sidebar</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md border border-border text-xs font-mono flex items-center gap-1">
                      <Command className="h-3 w-3" /> B
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Features Spotlight */}
            <div className="md:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                    <Code2 className="h-32 w-32" />
                  </div>
                  <Code2 className="h-8 w-8 text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Integrated Editor</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Write Verilog with intelligent syntax highlighting. The editor is highly optimized for HDL coding with multiple files support in the workspace.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                    <Play className="h-32 w-32" />
                  </div>
                  <Play className="h-8 w-8 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Fast Simulation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Native integration with Icarus Verilog brings lightning-fast compile times and execution without leaving the IDE interface.
                  </p>
                </div>

                <div className="sm:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 relative overflow-hidden group">
                   <div className="absolute top-0 right-10 p-4 opacity-10 transform -translate-y-10 group-hover:scale-110 transition-transform duration-500">
                    <Activity className="h-48 w-48" />
                  </div>
                  <Activity className="h-8 w-8 text-purple-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Advanced Waveform Viewer</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                    Our custom built-in VCD viewer automatically loads your simulation dumps. Navigate precisely with smart cursor tracking, radix formatting (HEX/BIN/DEC), and instant tooltip evaluation.
                  </p>
                  
                  <div className="mt-8 flex gap-8">
                    <div>
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">8</div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Templates</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600">0ms</div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Latency</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">VCD</div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Support</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
