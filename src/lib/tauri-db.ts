import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useIDEStore } from '../store/ide-store';

export function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export async function openProjectFile() {
  console.log('TauriDB: openProjectFile called');
  try {
    const selectedPath = await open({
      multiple: false,
      filters: [{ name: 'Verisim Project', extensions: ['vsm'] }]
    });

    if (selectedPath && typeof selectedPath === 'string') {
      const project = await invoke<any>('open_project', { path: selectedPath });
      useIDEStore.getState().setCurrentProject(project, selectedPath);
      return project;
    }
    return null;
  } catch (error) {
    console.error('TauriDB: openProjectFile error:', error);
    throw error;
  }
}

export async function saveProjectFile(isSaveAs = false) {
  console.log('TauriDB: saveProjectFile called', { isSaveAs });
  try {
    const { currentProject, projectPath, setCurrentProject } = useIDEStore.getState();
    if (!currentProject) return null;

    let targetPath = projectPath;

    if (!targetPath || isSaveAs) {
      const selectedPath = await save({
        filters: [{ name: 'Verisim Project', extensions: ['vsm'] }],
        defaultPath: `${currentProject.name || 'Project'}.vsm`
      });
      if (!selectedPath) return null;
      targetPath = selectedPath;
    }

    currentProject.updated_at = new Date().toISOString();

    await invoke('save_project', { path: targetPath, project: currentProject });
    
    // Update path in store if it changed
    if (projectPath !== targetPath) {
      setCurrentProject(currentProject, targetPath);
    }

    return targetPath;
  } catch (error) {
    console.error('TauriDB: saveProjectFile error:', error);
    throw error;
  }
}

export function createNewProject(name: string, description: string, template: string) {
  console.log('TauriDB: createNewProject called', { name, description, template });
  const projectId = generateId();
  const now = new Date().toISOString();
  
  const files = getTemplateFiles(template).map(f => ({
    id: `${projectId}:${f.name}`,
    name: f.name,
    content: f.content,
    type: f.type,
    project_id: projectId,
    created_at: now,
    updated_at: now
  }));

  const project = {
    id: projectId,
    name,
    description: description || null,
    files,
    created_at: now,
    updated_at: now
  };

  useIDEStore.getState().setCurrentProject(project, null);
  return project;
}

export async function runSimulation(projectId: string, files: any[]) {
  console.log('TauriDB: runSimulation called', { projectId });
  try {
    const backendFiles = files.map(f => ({
        id: f.id,
        name: f.name,
        content: f.content,
        type: f.type,
        project_id: f.project_id || projectId
    }));
    const result = await invoke('simulate', { files: backendFiles });
    console.log('TauriDB: runSimulation success', result);
    return result;
  } catch (error) {
    console.error('TauriDB: runSimulation error:', error);
    return {
      success: false,
      output: `Simulation failed: ${error}`,
    };
  }
}

export function getTemplateFiles(template: string) {
  const templates: Record<string, Array<{ name: string; content: string; type: string }>> = {
    none: [
        {
          name: 'main.v',
          type: 'verilog',
          content: '// New Verilog file\nmodule main();\n\nendmodule',
        }
    ],
    basic: [
      {
        name: 'counter.v',
        type: 'verilog',
        content: `// 4-bit Counter Example\nmodule counter(\n    input wire clk,\n    input wire rst,\n    input wire enable,\n    output reg [3:0] count\n);\n\nalways @(posedge clk or posedge rst) begin\n    if (rst) begin\n        count <= 4'b0000;\n    end else if (enable) begin\n        count <= count + 1;\n    end\nend\n\nendmodule`,
      },
      {
        name: 'counter_tb.v',
        type: 'testbench',
        content: `// Testbench for 4-bit Counter\n\`timescale 1ns/1ps\n\nmodule counter_tb;\n    reg clk;\n    reg rst;\n    reg enable;\n    wire [3:0] count;\n\n    counter uut (\n        .clk(clk),\n        .rst(rst),\n        .enable(enable),\n        .count(count)\n    );\n\n    initial begin\n        clk = 0;\n        forever #5 clk = ~clk;\n    end\n\n    initial begin\n        rst = 1;\n        enable = 0;\n        #10 rst = 0;\n        #10 enable = 1;\n        #100 enable = 1;\n        #20 rst = 1;\n        #10 rst = 0;\n        #10 enable = 1;\n        #50 $finish;\n    end\n\n    initial begin\n        $monitor("Time=%0t, rst=%b, enable=%b, count=%d",\n                 $time, rst, enable, count);\n    end\n\n    initial begin\n        $dumpfile("counter.vcd");\n        $dumpvars(0, counter_tb);\n    end\nendmodule`,
      },
    ],
    mux: [
      {
        name: 'mux4to1.v',
        type: 'verilog',
        content: `// 4-to-1 Multiplexer\nmodule mux4to1(\n    input wire [3:0] data_in,\n    input wire [1:0] select,\n    output reg data_out\n);\n\nalways @(*) begin\n    case (select)\n        2'b00: data_out = data_in[0];\n        2'b01: data_out = data_in[1];\n        2'b10: data_out = data_in[2];\n        2'b11: data_out = data_in[3];\n        default: data_out = 1'bx;\n    endcase\nend\n\nendmodule`,
      },
      {
        name: 'mux4to1_tb.v',
        type: 'testbench',
        content: `// Testbench for 4-to-1 MUX\n\`timescale 1ns/1ps\n\nmodule mux4to1_tb;\n    reg [3:0] data_in;\n    reg [1:0] select;\n    wire data_out;\n\n    mux4to1 uut (\n        .data_in(data_in),\n        .select(select),\n        .data_out(data_out)\n    );\n\n    initial begin\n        data_in = 4'b1010;\n        select = 2'b00; #10;\n        select = 2'b01; #10;\n        select = 2'b10; #10;\n        select = 2'b11; #10;\n        data_in = 4'b0101;\n        select = 2'b00; #10;\n        select = 2'b01; #10;\n        select = 2'b10; #10;\n        select = 2'b11; #10;\n        $finish;\n    end\n\n    initial begin\n        $monitor("Time=%0t, data_in=%b, select=%b, data_out=%b",\n                 $time, data_in, select, data_out);\n    end\n\n    initial begin\n        $dumpfile("mux4to1.vcd");\n        $dumpvars(0, mux4to1_tb);\n    end\nendmodule`,
      },
    ],
    alu: [
      {
        name: 'alu.v',
        type: 'verilog',
        content: `// Simple ALU\nmodule alu(\n    input wire [7:0] a,\n    input wire [7:0] b,\n    input wire [2:0] op,\n    output reg [7:0] result,\n    output reg zero,\n    output reg carry\n);\n\nalways @(*) begin\n    carry = 0;\n    case (op)\n        3'b000: {carry, result} = a + b;\n        3'b001: {carry, result} = a - b;\n        3'b010: result = a & b;\n        3'b011: result = a | b;\n        3'b100: result = a ^ b;\n        3'b101: result = ~a;\n        3'b110: result = a << 1;\n        3'b111: result = a >> 1;\n        default: result = 8'b0;\n    endcase\n    zero = (result == 8'b0);\nend\n\nendmodule`,
      },
      {
        name: 'alu_tb.v',
        type: 'testbench',
        content: `// Testbench for ALU\n\`timescale 1ns/1ps\n\nmodule alu_tb;\n    reg [7:0] a, b;\n    reg [2:0] op;\n    wire [7:0] result;\n    wire zero, carry;\n\n    alu uut (\n        .a(a), .b(b), .op(op),\n        .result(result), .zero(zero), .carry(carry)\n    );\n\n    initial begin\n        a = 8'h50; b = 8'h30; op = 3'b000; #10;\n        op = 3'b001; #10;\n        a = 8'hFF; b = 8'h0F; op = 3'b010; #10;\n        op = 3'b011; #10;\n        op = 3'b100; #10;\n        a = 8'h55; op = 3'b101; #10;\n        a = 8'h01; op = 3'b110; #10;\n        op = 3'b111; #10;\n        $finish;\n    end\n\n    initial begin\n        $monitor("Time=%0t, a=%h, b=%h, op=%b, result=%h, zero=%b, carry=%b",\n                 $time, a, b, op, result, zero, carry);\n    end\n\n    initial begin\n        $dumpfile("alu.vcd");\n        $dumpvars(0, alu_tb);\n    end\nendmodule`,
      },
    ],
    fsm: [
      {
        name: 'fsm.v',
        type: 'verilog',
        content: `// Traffic Light Controller FSM\nmodule traffic_light_fsm(\n    input wire clk,\n    input wire rst,\n    input wire emergency,\n    output reg [2:0] light\n);\n\nparameter GREEN = 2'b00, YELLOW = 2'b01, RED = 2'b10;\nreg [1:0] state, next_state;\nreg [3:0] timer;\n\nalways @(posedge clk or posedge rst) begin\n    if (rst) begin\n        state <= GREEN;\n        timer <= 0;\n    end else begin\n        state <= next_state;\n        if (timer < 15) timer <= timer + 1;\n        else timer <= 0;\n    end\nend\n\nalways @(*) begin\n    if (emergency) next_state = RED;\n    else case (state)\n        GREEN:  next_state = (timer == 10) ? YELLOW : GREEN;\n        YELLOW: next_state = (timer == 3) ? RED : YELLOW;\n        RED:    next_state = (timer == 15) ? GREEN : RED;\n        default: next_state = GREEN;\n    endcase\nend\n\nalways @(*) case (state)\n    GREEN:  light = 3'b001;\n    YELLOW: light = 3'b010;\n    RED:    light = 3'b100;\n    default: light = 3'b100;\nendcase\nendmodule`,
      },
      {
        name: 'fsm_tb.v',
        type: 'testbench',
        content: `// Testbench for FSM\n\`timescale 1ns/1ps\n\nmodule traffic_light_fsm_tb;\n    reg clk, rst, emergency;\n    wire [2:0] light;\n\n    traffic_light_fsm uut (.clk(clk), .rst(rst), .emergency(emergency), .light(light));\n\n    initial begin\n        clk = 0;\n        forever #5 clk = ~clk;\n    end\n\n    initial begin\n        rst = 1; emergency = 0; #20 rst = 0;\n        #200 emergency = 1; #50 emergency = 0;\n        #200 $finish;\n    end\n\n    initial begin\n        $monitor("Time=%0t, light=%b, emergency=%b", $time, light, emergency);\n    end\n\n    initial begin\n        $dumpfile("traffic_light.vcd");\n        $dumpvars(0, traffic_light_fsm_tb);\n    end\nendmodule`,
      },
    ],
    dff: [
      {
        name: 'dff.v',
        type: 'verilog',
        content: `// D Flip-Flop with Synchronous Reset\nmodule dff(\n    input wire clk,\n    input wire rst,\n    input wire d,\n    output reg q\n);\n\nalways @(posedge clk) begin\n    if (rst) q <= 1'b0;\n    else q <= d;\nend\nendmodule`,
      },
      {
        name: 'dff_tb.v',
        type: 'testbench',
        content: `// Testbench for D Flip-Flop\n\`timescale 1ns/1ps\n\nmodule dff_tb;\n    reg clk, rst, d;\n    wire q;\n\n    dff uut (.clk(clk), .rst(rst), .d(d), .q(q));\n\n    initial begin\n        clk = 0;\n        forever #5 clk = ~clk;\n    end\n\n    initial begin\n        rst = 1; d = 0; #20 rst = 0;\n        #10 d = 1; #10 d = 0; #10 d = 1;\n        #10 rst = 1; #10 rst = 0; #10 d = 0;\n        #50 $finish;\n    end\n\n    initial begin\n        $monitor("Time=%0t, rst=%b, d=%b, q=%b", $time, rst, d, q);\n    end\n\n    initial begin\n        $dumpfile("dff.vcd");\n        $dumpvars(0, dff_tb);\n    end\nendmodule`,
      },
    ],
    shift_reg: [
      {
        name: 'shift_reg.v',
        type: 'verilog',
        content: `// 4-bit Shift Register\nmodule shift_reg(\n    input wire clk,\n    input wire rst,\n    input wire load,\n    input wire [3:0] din,\n    input wire shift_in,\n    output reg [3:0] q\n);\n\nalways @(posedge clk or posedge rst) begin\n    if (rst) q <= 4'b0000;\n    else if (load) q <= din;\n    else q <= {q[2:0], shift_in};\nend\nendmodule`,
      },
      {
        name: 'shift_reg_tb.v',
        type: 'testbench',
        content: `// Testbench for Shift Register\n\`timescale 1ns/1ps\n\nmodule shift_reg_tb;\n    reg clk, rst, load;\n    reg [3:0] din;\n    reg shift_in;\n    wire [3:0] q;\n\n    shift_reg uut (.clk(clk), .rst(rst), .load(load), .din(din), .shift_in(shift_in), .q(q));\n\n    initial begin\n        clk = 0;\n        forever #5 clk = ~clk;\n    end\n\n    initial begin\n        rst = 1; load = 0; din = 4'b0; shift_in = 0; #15 rst = 0;\n        #10 load = 1; din = 4'b1011;\n        #10 load = 0;\n        #10 shift_in = 1; #10 shift_in = 0; #10 shift_in = 1; #10 shift_in = 1;\n        #50 $finish;\n    end\n\n    initial begin\n        $dumpfile("shift_reg.vcd");\n        $dumpvars(0, shift_reg_tb);\n    end\nendmodule`,
      },
    ],
    memory: [
      {
        name: 'ram.v',
        type: 'verilog',
        content: `// 16x8 Single-Port RAM\nmodule ram(\n    input wire clk,\n    input wire we,\n    input wire [3:0] addr,\n    input wire [7:0] din,\n    output reg [7:0] dout\n);\n\n    reg [7:0] mem [0:15];\n    always @(posedge clk) begin\n        if (we) mem[addr] <= din;\n        dout <= mem[addr];\n    end\nendmodule`,
      },
      {
        name: 'ram_tb.v',
        type: 'testbench',
        content: `// Testbench for RAM\n\`timescale 1ns/1ps\n\nmodule ram_tb;\n    reg clk, we;\n    reg [3:0] addr;\n    reg [7:0] din;\n    wire [7:0] dout;\n\n    ram uut (.clk(clk), .we(we), .addr(addr), .din(din), .dout(dout));\n\n    initial begin\n        clk = 0;\n        forever #5 clk = ~clk;\n    end\n\n    initial begin\n        we = 0; addr = 0; din = 0; #15;\n        we = 1; addr = 4'h5; din = 8'hA5; #10;\n        we = 1; addr = 4'hA; din = 8'h3C; #10;\n        we = 0; addr = 4'h5; #10;\n        we = 0; addr = 4'hA; #10;\n        #50 $finish;\n    end\n\n    initial begin\n        $dumpfile("ram.vcd");\n        $dumpvars(0, ram_tb);\n    end\nendmodule`,
      },
    ],
  };
  return templates[template] || templates.basic;
}
