'use client';

import { useIDEStore, VerilogFile } from '@/store/ide-store';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  X, 
  Zap, 
  Activity, 
  FileCode, 
  Copy, 
  Check, 
  PlusCircle, 
  AlertTriangle, 
  Wand2, 
  HelpCircle,
  FilePlus,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ParsedPort {
  direction: 'input' | 'output' | 'inout';
  type: string;
  width: string;
  name: string;
}

interface AIAssistStudioProps {
  drawerMode?: boolean;
}

export function AIAssistStudio({ drawerMode = false }: AIAssistStudioProps = {}) {
  const { 
    isAiAssistOpen, 
    toggleAiAssist, 
    activeFile, 
    currentProject, 
    setProjectFiles, 
    openFile, 
    updateFileContent 
  } = useIDEStore();

  const [activeTab, setActiveTab] = useState<'tb' | 'fsm' | 'vcd' | 'lint'>('tb');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // FSM generator config
  const [fsmStates, setFsmStates] = useState<'3' | '4'>('3');
  const [fsmStyle, setFsmStyle] = useState<'sv' | 'v'>('sv');

  if (!isAiAssistOpen && !drawerMode) return null;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Parse current active Verilog/SystemVerilog module
  const parseActiveModule = () => {
    if (!activeFile) return null;
    const content = activeFile.content;

    const moduleMatch = content.match(/module\s+([a-zA-Z_]\w*)/);
    if (!moduleMatch) return null;

    const moduleName = moduleMatch[1];
    const isSystemVerilog = activeFile.name.endsWith('.sv') || activeFile.name.endsWith('.svh');

    // Extract ports
    const portRegex = /(input|output|inout)\s+(?:wire|reg|logic)?\s*(\[[^\]]+\])?\s*([a-zA-Z_]\w*)/g;
    const ports: ParsedPort[] = [];
    let match;

    while ((match = portRegex.exec(content)) !== null) {
      ports.push({
        direction: match[1] as any,
        type: isSystemVerilog ? 'logic' : (match[1] === 'output' ? 'wire' : 'reg'),
        width: match[2] || '',
        name: match[3],
      });
    }

    const clockPort = ports.find(p => p.direction === 'input' && /(clk|clock)/i.test(p.name));
    const resetPort = ports.find(p => p.direction === 'input' && /(rst|reset)/i.test(p.name));

    return {
      moduleName,
      isSystemVerilog,
      ports,
      clockPort,
      resetPort,
    };
  };

  // Generator 1: Instant Testbench Generator
  const generateTestbenchCode = () => {
    const parsed = parseActiveModule();
    if (!parsed) {
      return `// Open a Verilog or SystemVerilog module file to generate a matching testbench.\n`;
    }

    const tbName = `${parsed.moduleName}_tb`;
    const ext = parsed.isSystemVerilog ? 'sv' : 'v';
    const clkName = parsed.clockPort ? parsed.clockPort.name : 'clk';
    const rstName = parsed.resetPort ? parsed.resetPort.name : 'rst_n';

    const inputSignals = parsed.ports
      .filter(p => p.direction === 'input')
      .map(p => `    ${parsed.isSystemVerilog ? 'logic' : 'reg  '} ${p.width ? p.width + ' ' : ''}${p.name};`)
      .join('\n');

    const outputSignals = parsed.ports
      .filter(p => p.direction === 'output')
      .map(p => `    ${parsed.isSystemVerilog ? 'logic' : 'wire '} ${p.width ? p.width + ' ' : ''}${p.name};`)
      .join('\n');

    const portConnections = parsed.ports
      .map(p => `        .${p.name}(${p.name})`)
      .join(',\n');

    const initialStimulus = parsed.ports
      .filter(p => p.direction === 'input' && p.name !== clkName && p.name !== rstName)
      .map(p => `        ${p.name} = '0; #10;`)
      .join('\n');

    return `\`timescale 1ns/1ps

module ${tbName};

    // Parameters & Signals
${inputSignals ? inputSignals + '\n' : ''}${outputSignals ? outputSignals + '\n' : ''}
    // Unit Under Test (UUT)
    ${parsed.moduleName} uut (
${portConnections || '        // ports here'}
    );

    // Clock Generation (100MHz, 10ns period)
    initial begin
        ${clkName} = 0;
        forever #5 ${clkName} = ~${clkName};
    end

    // Stimulus Sequence
    initial begin
        // Initialize inputs
        ${rstName} = 0;
${initialStimulus}
        // Release reset
        #20 ${rstName} = 1;
        #20;

        // Apply stimulus test vectors
        #100;
        $display("[%0t] Test sequence completed successfully.", $time);
        $finish;
    end

    // Waveform Generation
    initial begin
        $dumpfile("${parsed.moduleName}.vcd");
        $dumpvars(0, ${tbName});
    end

endmodule`;
  };

  const createTestbenchFile = () => {
    const parsed = parseActiveModule();
    if (!parsed || !currentProject) {
      toast.error('No module detected to create testbench for');
      return;
    }

    const ext = parsed.isSystemVerilog ? 'sv' : 'v';
    const tbFileName = `${parsed.moduleName}_tb.${ext}`;
    const tbContent = generateTestbenchCode();

    // Check if file already exists
    const existing = currentProject.files.find(f => f.name === tbFileName);
    if (existing) {
      updateFileContent(existing.id, tbContent);
      openFile(existing);
      toast.info(`Updated existing ${tbFileName}`);
      return;
    }

    const newFile: VerilogFile = {
      id: `${currentProject.id}:${tbFileName}`,
      name: tbFileName,
      content: tbContent,
      type: 'testbench',
      project_id: currentProject.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedFiles = [...currentProject.files, newFile];
    setProjectFiles(updatedFiles);
    openFile(newFile);
    toast.success(`Created & opened ${tbFileName}`);
  };

  // Generator 2: FSM Builder
  const generateFSMCode = () => {
    if (fsmStyle === 'sv') {
      return `// 3-Process SystemVerilog FSM
typedef enum logic [1:0] {
    STATE_IDLE  = 2'b00,
    STATE_FETCH = 2'b01,
    STATE_EXEC  = 2'b10${fsmStates === '4' ? ',\n    STATE_DONE  = 2\'b11' : ''}
} fsm_state_t;

fsm_state_t state, next_state;

// 1. State Register (Sequential)
always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        state <= STATE_IDLE;
    end else begin
        state <= next_state;
    end
end

// 2. Next State Logic (Combinational)
always_comb begin
    next_state = state;
    case (state)
        STATE_IDLE: begin
            if (start) next_state = STATE_FETCH;
        end
        STATE_FETCH: begin
            if (ready) next_state = STATE_EXEC;
        end
        STATE_EXEC: begin
            ${fsmStates === '4' ? 'next_state = STATE_DONE;' : 'next_state = STATE_IDLE;'}
        end
        ${fsmStates === '4' ? 'STATE_DONE: begin\n            next_state = STATE_IDLE;\n        end\n        ' : ''}default: next_state = STATE_IDLE;
    endcase
end

// 3. Output Decoder Logic
always_comb begin
    busy = (state != STATE_IDLE);
    done = ${fsmStates === '4' ? '(state == STATE_DONE)' : '(state == STATE_EXEC)'};
end`;
    } else {
      return `// Classic Verilog FSM
localparam IDLE  = 2'b00;
localparam FETCH = 2'b01;
localparam EXEC  = 2'b10;
${fsmStates === '4' ? 'localparam DONE  = 2\'b11;\n' : ''}
reg [1:0] state, next_state;

always @(posedge clk or posedge rst) begin
    if (rst) state <= IDLE;
    else state <= next_state;
end

always @(*) begin
    next_state = state;
    case (state)
        IDLE:  if (start) next_state = FETCH;
        FETCH: if (ready) next_state = EXEC;
        EXEC:  ${fsmStates === '4' ? 'next_state = DONE;' : 'next_state = IDLE;'}
        ${fsmStates === '4' ? 'DONE:  next_state = IDLE;\n        ' : ''}default: next_state = IDLE;
    endcase
end`;
    }
  };

  // Generator 3: Inject Waveform VCD
  const injectWaveformDump = () => {
    if (!activeFile) return;
    const content = activeFile.content;

    if (content.includes('$dumpfile')) {
      toast.info('Active file already contains a $dumpfile statement');
      return;
    }

    const baseName = activeFile.name.replace(/\.[^/.]+$/, '');
    const dumpBlock = `\n    // Generated Waveform Dump for VCD Viewer\n    initial begin\n        $dumpfile("${baseName}.vcd");\n        $dumpvars(0, ${baseName});\n    end\n`;

    let newContent = content;
    const endmoduleIndex = content.lastIndexOf('endmodule');
    if (endmoduleIndex !== -1) {
      newContent = content.slice(0, endmoduleIndex) + dumpBlock + '\n' + content.slice(endmoduleIndex);
    } else {
      newContent = content + dumpBlock;
    }

    updateFileContent(activeFile.id, newContent);
    toast.success('Injected $dumpfile waveform block into active file');
  };

  // Generator 4: Hardware Linter & Heuristic Bug Explainer
  const runHardwareLinter = () => {
    if (!activeFile) return [];
    const content = activeFile.content;
    const findings: Array<{ title: string; desc: string; fix?: () => void }> = [];

    // Check 1: Inadvertent blocking assignment in clocked always
    if (/always\s*@\s*\(\s*posedge[^)]*\)[^;]*begin[\s\S]*?[^=!<>]=[^=]/g.test(content)) {
      findings.push({
        title: 'Blocking Assignment in Clocked Block',
        desc: 'Using "=" instead of "<=" inside always @(posedge clk) causes race conditions and simulation-synthesis mismatches.',
      });
    }

    // Check 2: Missing default in case statement
    if (/case\s*\([^)]+\)[\s\S]*?endcase/g.test(content) && !content.includes('default:')) {
      findings.push({
        title: 'Inferred Latch Risk (Missing default in case)',
        desc: 'A case statement without a default branch can unintentionally infer hardware transparent latches.',
      });
    }

    // Check 3: Missing $dumpfile in testbench
    if ((activeFile.name.includes('_tb') || activeFile.content.includes('$finish')) && !content.includes('$dumpfile')) {
      findings.push({
        title: 'Missing Waveform Dump ($dumpfile)',
        desc: 'This testbench has no $dumpfile. You will not be able to view waveforms in the VCD Viewer.',
        fix: injectWaveformDump,
      });
    }

    // Check 4: Old Verilog reg vs SystemVerilog logic
    if (activeFile.name.endsWith('.sv') && content.includes('reg ') && !content.includes('logic ')) {
      findings.push({
        title: 'Legacy "reg" in SystemVerilog file',
        desc: 'Consider using "logic" instead of "reg" for modern SystemVerilog 4-state nets and variables.',
      });
    }

    return findings;
  };

  const parsed = parseActiveModule();
  const lintFindings = runHardwareLinter();
  const testbenchCode = generateTestbenchCode();
  const fsmCode = generateFSMCode();

  return (
    <div className={cn(drawerMode ? "w-full border-none shadow-none" : "w-80 border-l border-border shadow-xl", "h-full bg-card flex flex-col z-30")}>
      {/* Header */}
      <div className="p-3 border-b border-border/60 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Wand2 className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">HDL Design Assistant</h3>
            <p className="text-[10px] text-muted-foreground">Offline Hardware Generator</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={toggleAiAssist}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 p-1.5 gap-1 bg-muted/40 border-b border-border/40 text-[11px]">
        <button
          onClick={() => setActiveTab('tb')}
          className={cn(
            "py-1 rounded font-medium transition-colors text-center",
            activeTab === 'tb' ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          Testbench
        </button>
        <button
          onClick={() => setActiveTab('fsm')}
          className={cn(
            "py-1 rounded font-medium transition-colors text-center",
            activeTab === 'fsm' ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          FSM
        </button>
        <button
          onClick={() => setActiveTab('vcd')}
          className={cn(
            "py-1 rounded font-medium transition-colors text-center",
            activeTab === 'vcd' ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          Waves
        </button>
        <button
          onClick={() => setActiveTab('lint')}
          className={cn(
            "py-1 rounded font-medium transition-colors text-center relative",
            activeTab === 'lint' ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          Lint
          {lintFindings.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-3">
        {/* Testbench Generator Tab */}
        {activeTab === 'tb' && (
          <div className="space-y-3">
            <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-md">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs mb-1">
                <Zap className="h-3.5 w-3.5" />
                <span>Instant Testbench Generator</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Automatically scans active module ports, creates stimulus drivers, connects clock/reset, and hooks VCD logging.
              </p>
            </div>

            {parsed ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-muted-foreground">Detected Module:</span>
                  <Badge variant="outline" className="font-mono text-[11px] text-blue-400 border-blue-500/30">
                    {parsed.moduleName}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-muted-foreground">Ports Count:</span>
                  <span className="font-mono text-xs">{parsed.ports.length} ports</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={createTestbenchFile}
                  >
                    <FilePlus className="h-3.5 w-3.5 mr-1" />
                    Create File
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-2.5"
                    onClick={() => copyText(testbenchCode, 'tb')}
                  >
                    {copiedCode === 'tb' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] text-muted-foreground font-medium">Generated Preview:</span>
                  <pre className="mt-1 p-2 rounded bg-muted/30 border border-border/40 text-[10px] font-mono overflow-x-auto max-h-48 text-muted-foreground leading-normal">
                    {testbenchCode}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <FileCode className="h-8 w-8 mx-auto mb-2 opacity-40 text-blue-400" />
                <p>Open a Verilog or SystemVerilog file with a module to scaffold its testbench.</p>
              </div>
            )}
          </div>
        )}

        {/* FSM Generator Tab */}
        {activeTab === 'fsm' && (
          <div className="space-y-3">
            <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-md">
              <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-xs mb-1">
                <Layers className="h-3.5 w-3.5" />
                <span>FSM State Machine Scaffold</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Generates robust, synthesis-ready Moore state machine templates.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Language Style:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFsmStyle('sv')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                      fsmStyle === 'sv' ? "bg-purple-600 text-white border-purple-600" : "bg-muted/30 border-transparent text-muted-foreground"
                    )}
                  >
                    SystemVerilog
                  </button>
                  <button
                    onClick={() => setFsmStyle('v')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                      fsmStyle === 'v' ? "bg-purple-600 text-white border-purple-600" : "bg-muted/30 border-transparent text-muted-foreground"
                    )}
                  >
                    Verilog-2001
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">State Count:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFsmStates('3')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                      fsmStates === '3' ? "bg-purple-600 text-white border-purple-600" : "bg-muted/30 border-transparent text-muted-foreground"
                    )}
                  >
                    3 States
                  </button>
                  <button
                    onClick={() => setFsmStates('4')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                      fsmStates === '4' ? "bg-purple-600 text-white border-purple-600" : "bg-muted/30 border-transparent text-muted-foreground"
                    )}
                  >
                    4 States
                  </button>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white mt-1"
                onClick={() => {
                  if (activeFile) {
                    updateFileContent(activeFile.id, activeFile.content + '\n\n' + fsmCode);
                    toast.success('Inserted FSM code into active editor');
                  }
                }}
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                Insert into Active File
              </Button>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Code Preview:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => copyText(fsmCode, 'fsm')}
                  >
                    {copiedCode === 'fsm' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <pre className="p-2 rounded bg-muted/30 border border-border/40 text-[10px] font-mono overflow-x-auto max-h-48 text-muted-foreground leading-normal">
                  {fsmCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Waveform Dumper Tab */}
        {activeTab === 'vcd' && (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-md">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs mb-1">
                <Activity className="h-3.5 w-3.5" />
                <span>Auto Waveform Injector</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Injects standard $dumpfile and $dumpvars calls so the GTKWave-like VCD viewer can plot signal transitions.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={injectWaveformDump}
              >
                <Wand2 className="h-3.5 w-3.5 mr-1" />
                Inject VCD Dump Code
              </Button>

              <div className="p-2.5 rounded bg-muted/20 border border-border/40 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">How VCD waveforms work:</p>
                <p>1. $dumpfile("name.vcd") instructs Icarus to write transition traces to disk.</p>
                <p>2. $dumpvars(0, tb_name) records all hierarchically connected wire and reg states.</p>
                <p>3. After simulation, the Waveform tab in the bottom dock automatically parses the output!</p>
              </div>
            </div>
          </div>
        )}

        {/* Linter Tab */}
        {activeTab === 'lint' && (
          <div className="space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-md">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs mb-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Hardware Static Linter</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Rules-based offline lint engine scanning for common HDL synthesis bugs and race conditions.
              </p>
            </div>

            {lintFindings.length > 0 ? (
              <div className="space-y-2">
                {lintFindings.map((finding, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-muted/30 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{finding.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{finding.desc}</p>
                    {finding.fix && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 w-full"
                        onClick={finding.fix}
                      >
                        Auto-Apply Fix
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50 text-emerald-400" />
                <p className="text-foreground font-medium">No critical hazards detected</p>
                <p className="text-[11px] mt-1">Clock assignments, resets, and case statements look solid.</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
