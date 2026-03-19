import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, rm, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// Check if iverilog is available
async function checkIverilog(): Promise<boolean> {
  try {
    await execAsync('which iverilog');
    return true;
  } catch {
    return false;
  }
}

// POST run simulation
export async function POST(request: NextRequest) {
  const workDir = join(tmpdir(), `verilog_${Date.now()}`);
  
  try {
    const body = await request.json();
    const { projectId, files, testbenchName } = body;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Create working directory
    await mkdir(workDir, { recursive: true });

    // Write all files to working directory
    for (const file of files) {
      const filePath = join(workDir, file.name);
      await writeFile(filePath, file.content);
    }

    // Find testbench file
    const testbench = files.find((f: { name: string; type: string }) => 
      f.type === 'testbench' || f.name.includes('_tb')
    );

    if (!testbench) {
      return NextResponse.json({ 
        error: 'No testbench file found. Please create a testbench file (e.g., module_tb.v)' 
      }, { status: 400 });
    }

    const hasIverilog = await checkIverilog();

    if (!hasIverilog) {
      // Return mock simulation for demo purposes
      const mockResult = generateSmartMockSimulation(files, testbench.name);
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Demo Mode - Icarus Verilog not installed',
        output: mockResult.output,
        vcdContent: mockResult.vcdContent,
        installationGuide: getInstallationGuide(),
      });
    }

    // Run actual iverilog simulation
    const vvpFile = join(workDir, 'simulation.vvp');
    const vcdFile = join(workDir, testbench.name.replace('.v', '.vcd').replace('_tb', ''));

    // Compile
    const verilogFiles = files.map((f: { name: string }) => join(workDir, f.name)).join(' ');
    const compileCmd = `iverilog -o "${vvpFile}" ${verilogFiles}`;
    
    try {
      const { stdout: compileOut, stderr: compileErr } = await execAsync(compileCmd, {
        timeout: 30000,
      });

      if (compileErr && compileErr.includes('error')) {
        return NextResponse.json({
          success: false,
          error: 'Compilation failed',
          output: compileErr,
        });
      }
    } catch (compileError: unknown) {
      const err = compileError as { stderr?: string; message?: string };
      return NextResponse.json({
        success: false,
        error: 'Compilation failed',
        output: err.stderr || err.message,
      });
    }

    // Run simulation
    try {
      const { stdout: simOut, stderr: simErr } = await execAsync(`vvp "${vvpFile}"`, {
        timeout: 60000,
        cwd: workDir,
      });

      // Find any VCD file in the work directory
      const dirFiles = await readdir(workDir);
      const vcdFileName = dirFiles.find((f: string) => f.endsWith('.vcd'));
      
      let vcdContent = null;
      if (vcdFileName) {
        try {
          vcdContent = await readFile(join(workDir, vcdFileName), 'utf-8');
        } catch (vcdError) {
          console.error('Failed to read VCD file:', vcdError);
        }
      }

      // Update simulation record
      if (projectId) {
        await db.simulation.create({
          data: {
            projectId,
            status: 'completed',
            output: simOut || simErr,
            vcdPath: vcdFileName ? join(workDir, vcdFileName) : null,
            startTime: new Date(),
            endTime: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        output: (simOut || '') + (simErr || ''),
        vcdContent,
      });
    } catch (simError: unknown) {
      const err = simError as { stderr?: string; message?: string };
      return NextResponse.json({
        success: false,
        error: 'Simulation failed',
        output: err.stderr || err.message,
      });
    }
  } catch (error: unknown) {
    console.error('Simulation error:', error);
    const err = error as { message?: string };
    return NextResponse.json({
      success: false,
      error: 'Simulation failed',
      output: err.message,
    }, { status: 500 });
  } finally {
    // Cleanup working directory
    try {
      await rm(workDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

function getInstallationGuide(): string {
  return `INSTALL ICARUS VERILOG FOR YOUR SYSTEM:

═══════════════════════════════════════════════════════════════════
🐧 LINUX - Debian/Ubuntu/Mint/Pop!_OS:
   sudo apt-get update && sudo apt-get install iverilog

🐧 LINUX - Arch/Manjaro/EndeavourOS:
   sudo pacman -S iverilog

🐧 LINUX - Fedora/RHEL/CentOS/Rocky:
   sudo dnf install iverilog

🐧 LINUX - openSUSE:
   sudo zypper install iverilog

🐧 LINUX - Gentoo:
   sudo emerge sci-electronics/iverilog

🐧 LINUX - Alpine:
   sudo apk add iverilog

🐧 LINUX - Void:
   sudo xbps-install -S iverilog

🐧 LINUX - NixOS:
   nix-env -i iverilog
═══════════════════════════════════════════════════════════════════
🍎 macOS (Homebrew):
   brew install icarus-verilog

🍎 macOS (MacPorts):
   sudo port install iverilog
═══════════════════════════════════════════════════════════════════
🪟 Windows:
   Download from: http://bleyer.org/icarus/
   Or use WSL with Ubuntu
═══════════════════════════════════════════════════════════════════
After installation, restart VerilogSim IDE.`;
}

// Smart mock simulation that parses Verilog code
function generateSmartMockSimulation(
  files: { name: string; content: string }[], 
  testbenchName: string
): { output: string; vcdContent: string } {
  const moduleName = testbenchName.replace('_tb.v', '').replace('.v', '');
  
  // Parse signals from testbench
  const testbenchContent = files.find(f => f.name === testbenchName)?.content || '';
  const signals = parseVerilogSignals(testbenchContent);
  
  // Determine simulation type from file names/content
  const simType = detectSimulationType(files);
  
  // Generate output based on simulation type
  const output = generateSimulationOutput(moduleName, files, signals, simType);
  const vcdContent = generateVCD(moduleName, signals, simType);

  return { output, vcdContent };
}

interface Signal {
  name: string;
  type: 'input' | 'output' | 'reg' | 'wire';
  width: number;
  symbol: string;
}

function parseVerilogSignals(content: string): Signal[] {
  const signals: Signal[] = [];
  const symbolChars = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`';
  let symbolIndex = 0;
  
  // Match reg and wire declarations
  const regWireRegex = /(reg|wire)\s+(?:\[([0-9]+):([0-9]+)\]\s+)?(\w+)/g;
  let match;
  
  while ((match = regWireRegex.exec(content)) !== null) {
    const type = match[1] as 'reg' | 'wire';
    const msb = match[2] ? parseInt(match[2]) : 0;
    const lsb = match[3] ? parseInt(match[3]) : 0;
    const width = Math.abs(msb - lsb) + 1;
    const name = match[4];
    
    // Skip common non-signal names
    if (name === 'uut' || name === 'clk' && signals.some(s => s.name === 'clk')) continue;
    
    signals.push({
      name,
      type,
      width,
      symbol: symbolChars[symbolIndex++ % symbolChars.length]
    });
  }
  
  // Add common signals if not found
  if (!signals.find(s => s.name === 'clk')) {
    signals.unshift({ name: 'clk', type: 'reg', width: 1, symbol: '!' });
  }
  
  return signals;
}

type SimType = 'counter' | 'mux' | 'alu' | 'fsm' | 'generic';

function detectSimulationType(files: { name: string; content: string }[]): SimType {
  const allContent = files.map(f => f.content.toLowerCase()).join(' ');
  const fileNames = files.map(f => f.name.toLowerCase()).join(' ');
  
  if (fileNames.includes('counter') || allContent.includes('counter')) return 'counter';
  if (fileNames.includes('mux') || allContent.includes('multiplexer') || allContent.includes('mux')) return 'mux';
  if (fileNames.includes('alu') || allContent.includes('alu')) return 'alu';
  if (fileNames.includes('fsm') || allContent.includes('traffic') || allContent.includes('state')) return 'fsm';
  
  return 'generic';
}

function generateSimulationOutput(
  moduleName: string,
  files: { name: string; content: string }[],
  signals: Signal[],
  simType: SimType
): string {
  let output = '';
  
  output += `╔══════════════════════════════════════════════════════════════╗\n`;
  output += `║           VerilogSim IDE - Demo Simulation Mode              ║\n`;
  output += `╠══════════════════════════════════════════════════════════════╣\n`;
  output += `║  Note: Icarus Verilog not installed. Using demo simulator.   ║\n`;
  output += `╚══════════════════════════════════════════════════════════════╝\n\n`;
  
  output += `📂 Compiling Verilog files:\n`;
  files.forEach(f => {
    output += `   ✓ ${f.name}\n`;
  });
  output += `\n`;
  
  output += `🔧 Parsing module: ${moduleName}\n`;
  output += `📊 Detected signals: ${signals.map(s => s.name).join(', ')}\n\n`;
  
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `                         SIMULATION OUTPUT                       \n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Generate type-specific output
  switch (simType) {
    case 'counter':
      output += generateCounterOutput(signals);
      break;
    case 'mux':
      output += generateMuxOutput(signals);
      break;
    case 'alu':
      output += generateAluOutput(signals);
      break;
    case 'fsm':
      output += generateFsmOutput(signals);
      break;
    default:
      output += generateGenericOutput(signals);
  }
  
  output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `✅ Simulation completed successfully\n`;
  output += `📈 VCD waveform data generated\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  return output;
}

function generateCounterOutput(signals: Signal[]): string {
  let output = '';
  const hasRst = signals.find(s => s.name === 'rst');
  const hasEnable = signals.find(s => s.name === 'enable');
  const countSignal = signals.find(s => s.name === 'count');
  
  output += `Initializing testbench...\n`;
  output += `Clock period: 10ns (5ns high, 5ns low)\n\n`;
  
  let time = 0;
  let count = 0;
  let rst = 1;
  let enable = 0;
  
  // Reset phase
  output += `[Phase 1: Reset]\n`;
  output += `  Time=${time}ns: rst=${rst}, enable=${enable}, count=${count}\n`;
  
  for (let i = 0; i < 3; i++) {
    time += 10;
    output += `  Time=${time}ns: rst=${rst}, enable=${enable}, count=${count}\n`;
  }
  
  // Enable phase
  rst = 0;
  enable = 1;
  output += `\n[Phase 2: Counting enabled]\n`;
  
  for (let i = 0; i < 12; i++) {
    time += 10;
    count = (count + 1) % 16;
    output += `  Time=${time}ns: rst=${rst}, enable=${enable}, count=${count} (${count.toString(16).toUpperCase()}h)\n`;
  }
  
  // Disable phase
  enable = 0;
  output += `\n[Phase 3: Counting disabled]\n`;
  for (let i = 0; i < 3; i++) {
    time += 10;
    output += `  Time=${time}ns: rst=${rst}, enable=${enable}, count=${count}\n`;
  }
  
  // Reset again
  rst = 1;
  output += `\n[Phase 4: Reset asserted]\n`;
  time += 10;
  count = 0;
  output += `  Time=${time}ns: rst=${rst}, enable=${enable}, count=${count}\n`;
  
  return output;
}

function generateMuxOutput(signals: Signal[]): string {
  let output = '';
  
  output += `Testing 4-to-1 Multiplexer\n\n`;
  
  const dataValues = ['1010', '0101', '1100', '0011'];
  
  for (let sel = 0; sel < 4; sel++) {
    const dataIn = parseInt(dataValues[sel], 2);
    const dataOut = (dataIn >> sel) & 1;
    output += `  Time=${sel * 10}ns: data_in=${dataValues[sel]} (${dataIn}), select=${sel}, data_out=${dataOut}\n`;
  }
  
  output += `\nChanging data input pattern...\n`;
  const newData = ['1111', '0000', '1010', '0101'];
  
  for (let sel = 0; sel < 4; sel++) {
    const dataIn = parseInt(newData[sel], 2);
    const dataOut = (dataIn >> sel) & 1;
    output += `  Time=${(sel + 4) * 10}ns: data_in=${newData[sel]} (${dataIn}), select=${sel}, data_out=${dataOut}\n`;
  }
  
  return output;
}

function generateAluOutput(signals: Signal[]): string {
  let output = '';
  
  output += `Testing ALU Operations\n\n`;
  
  const operations = [
    { op: 'ADD', code: '000', a: 0x50, b: 0x30, result: 0x80 },
    { op: 'SUB', code: '001', a: 0x50, b: 0x30, result: 0x20 },
    { op: 'AND', code: '010', a: 0xFF, b: 0x0F, result: 0x0F },
    { op: 'OR', code: '011', a: 0xF0, b: 0x0F, result: 0xFF },
    { op: 'XOR', code: '100', a: 0xFF, b: 0x0F, result: 0xF0 },
    { op: 'NOT', code: '101', a: 0x55, b: 0x00, result: 0xAA },
    { op: 'SHL', code: '110', a: 0x01, b: 0x00, result: 0x02 },
    { op: 'SHR', code: '111', a: 0x02, b: 0x00, result: 0x01 },
  ];
  
  operations.forEach((op, i) => {
    output += `  Time=${i * 10}ns: op=${op.code} (${op.op}), a=0x${op.a.toString(16).toUpperCase().padStart(2, '0')}, b=0x${op.b.toString(16).toUpperCase().padStart(2, '0')} → result=0x${op.result.toString(16).toUpperCase().padStart(2, '0')}\n`;
  });
  
  return output;
}

function generateFsmOutput(signals: Signal[]): string {
  let output = '';
  
  output += `Traffic Light FSM Simulation\n\n`;
  
  const states = ['GREEN', 'YELLOW', 'RED'];
  const lights = ['001', '010', '100'];
  
  let time = 0;
  let state = 0;
  let emergency = 0;
  
  output += `[Normal Operation]\n`;
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let s = 0; s < 3; s++) {
      output += `  Time=${time}ns: state=${states[s]}, light=${lights[s]}, emergency=${emergency}\n`;
      time += 20;
    }
  }
  
  output += `\n[Emergency Mode Triggered]\n`;
  emergency = 1;
  time += 10;
  output += `  Time=${time}ns: state=RED, light=100, emergency=${emergency}\n`;
  
  time += 50;
  emergency = 0;
  output += `\n[Resuming Normal Operation]\n`;
  output += `  Time=${time}ns: emergency=${emergency}\n`;
  
  return output;
}

function generateGenericOutput(signals: Signal[]): string {
  let output = '';
  
  output += `Running generic testbench\n\n`;
  
  for (let i = 0; i < 10; i++) {
    const time = i * 10;
    const values = signals.slice(0, 4).map(s => {
      if (s.width === 1) return Math.random() > 0.5 ? '1' : '0';
      return Math.floor(Math.random() * Math.pow(2, s.width)).toString(16).toUpperCase();
    });
    
    const signalStr = signals.slice(0, 4).map((s, j) => `${s.name}=${values[j]}`).join(', ');
    output += `  Time=${time}ns: ${signalStr}\n`;
  }
  
  return output;
}

function generateVCD(moduleName: string, signals: Signal[], simType: SimType): string {
  let vcd = '';
  
  vcd += `$timescale 10ns / 1ns\n`;
  vcd += `$scope module ${moduleName}_tb $end\n`;
  
  // Add signal declarations
  signals.forEach(signal => {
    if (signal.width === 1) {
      vcd += `$var wire 1 ${signal.symbol} ${signal.name} $end\n`;
    } else {
      vcd += `$var wire ${signal.width} ${signal.symbol} ${signal.name} [${signal.width - 1}:0] $end\n`;
    }
  });
  
  vcd += `$upscope $end\n`;
  vcd += `$enddefinitions $end\n`;
  vcd += `$dumpvars\n`;
  
  // Initial values
  signals.forEach(signal => {
    if (signal.width === 1) {
      vcd += `0${signal.symbol}\n`;
    } else {
      vcd += `b${'0'.repeat(signal.width)} ${signal.symbol}\n`;
    }
  });
  
  vcd += `$end\n`;
  
  // Generate time-based value changes based on simulation type
  vcd += generateVCDValues(signals, simType);
  
  return vcd;
}

function generateVCDValues(signals: Signal[], simType: SimType): string {
  let vcd = '';
  const clkSignal = signals.find(s => s.name === 'clk');
  const countSignal = signals.find(s => s.name === 'count');
  const rstSignal = signals.find(s => s.name === 'rst');
  const enableSignal = signals.find(s => s.name === 'enable');
  
  const clkSymbol = clkSignal?.symbol || '!';
  const countSymbol = countSignal?.symbol || '$';
  const rstSymbol = rstSignal?.symbol || '"';
  const enableSymbol = enableSignal?.symbol || '#';
  
  let time = 0;
  let count = 0;
  let clk = 0;
  
  // Generate clock and signal transitions
  for (let i = 0; i < 50; i++) {
    time = i * 5;
    
    // Toggle clock
    clk = clk === 0 ? 1 : 0;
    vcd += `#${time}\n`;
    vcd += `${clk}${clkSymbol}\n`;
    
    // Add counter value changes
    if (countSignal && clk === 1) {
      const rst = time < 30 ? 1 : 0;
      const enable = time >= 30 && time < 150 ? 1 : 0;
      
      if (rst) {
        count = 0;
      } else if (enable) {
        count = (count + 1) % 16;
      }
      
      vcd += `b${count.toString(2).padStart(4, '0')} ${countSymbol}\n`;
      
      if (rstSignal) {
        vcd += `${rst}${rstSymbol}\n`;
      }
      if (enableSignal) {
        vcd += `${enable}${enableSymbol}\n`;
      }
    }
  }
  
  return vcd;
}
