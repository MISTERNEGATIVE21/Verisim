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
  ArrowRight
} from 'lucide-react';

export function WelcomeScreen() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 sm:p-8">
      <div className="text-center mb-8 max-w-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <Code2 className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500" />
          <h1 className="text-3xl sm:text-4xl font-bold">VerilogSim IDE</h1>
        </div>
        <p className="text-lg sm:text-xl text-muted-foreground mb-2 px-4">
          A self-hosted Verilog simulation environment for students
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground px-4">
          Design, simulate, and debug Verilog HDL code directly in your browser
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 w-full max-w-4xl">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <FileCode className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle className="text-lg">Write Code</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Full-featured code editor with Verilog syntax highlighting
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <Play className="h-8 w-8 text-green-500 mb-2" />
            <CardTitle className="text-lg">Simulate</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Run simulations using Icarus Verilog compiler
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card/50 backdrop-blur sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <Activity className="h-8 w-8 text-purple-500 mb-2" />
            <CardTitle className="text-lg">View Waveforms</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Visualize signal timing with built-in VCD viewer
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col items-center gap-4 text-center px-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Click <strong>New Project</strong> in the toolbar above to get started
        </p>
        
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <GraduationCap className="h-4 w-4 shrink-0" />
          <span>Perfect for learning digital logic design</span>
        </div>
      </div>

      <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center w-full max-w-4xl px-4">
        <div className="p-2 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-blue-500">5</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground">Templates</div>
        </div>
        <div className="p-2 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-green-500">Live</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground">Simulation</div>
        </div>
        <div className="p-2 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-purple-500">VCD</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground">Waveforms</div>
        </div>
        <div className="p-2 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-amber-500">Free</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground">Open Source</div>
        </div>
      </div>
    </div>
  );
}
