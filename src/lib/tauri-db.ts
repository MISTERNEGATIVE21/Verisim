import { invoke } from '@tauri-apps/api/core';

export async function fetchProjects() {
  console.log('TauriDB: fetchProjects called');
  try {
    const projects = await invoke<any[]>('get_projects');
    console.log('TauriDB: fetchProjects success', projects);
    return projects;
  } catch (error) {
    console.error('TauriDB: fetchProjects error:', error);
    return [];
  }
}

export async function createProject(name: string, description: string, template: string) {
  console.log('TauriDB: createProject called', { name, description, template });
  try {
    const files = getTemplateFiles(template).map(f => ({
        id: '', // Backend will generate
        name: f.name,
        content: f.content,
        type: f.type,
        project_id: '' // Backend will set
    }));
    
    console.log('TauriDB: invoking create_project with files', files);
    const project = await invoke<any>('create_project', { name, description, files });
    console.log('TauriDB: create_project success', project);
    return project;
  } catch (error) {
    console.error('TauriDB: createProject error:', error);
    throw error;
  }
}

export async function updateFile(id: string, content: string) {
  console.log('TauriDB: updateFile called', { id });
  try {
    await invoke('update_file', { id, content });
    console.log('TauriDB: updateFile success');
  } catch (error) {
    console.error('TauriDB: updateFile error:', error);
  }
}

export async function deleteProject(id: string) {
  console.log('TauriDB: deleteProject called', { id });
  try {
    await invoke('delete_project', { id });
    console.log('TauriDB: deleteProject success');
  } catch (error) {
    console.error('TauriDB: deleteProject error:', error);
  }
}

export async function createFile(projectId: string, name: string, type: string, content: string) {
  console.log('TauriDB: createFile called', { projectId, name, type });
  try {
    const file = await invoke<any>('create_file', { project_id: projectId, name, file_type: type, content });
    console.log('TauriDB: createFile success', file);
    return file;
  } catch (error) {
    console.error('TauriDB: createFile error:', error);
    throw error;
  }
}

export async function deleteFile(id: string) {
  console.log('TauriDB: deleteFile called', { id });
  try {
    await invoke('delete_file', { id });
    console.log('TauriDB: deleteFile success');
  } catch (error) {
    console.error('TauriDB: deleteFile error:', error);
  }
}

export async function renameFile(id: string, name: string) {
  console.log('TauriDB: renameFile called', { id, name });
  try {
    const file = await invoke<any>('rename_file', { id, name });
    console.log('TauriDB: renameFile success', file);
    return file;
  } catch (error) {
    console.error('TauriDB: renameFile error:', error);
    throw error;
  }
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

function getTemplateFiles(template: string) {
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
        content: `// 4-bit Counter Example
module counter(
    input wire clk,
    input wire rst,
    input wire enable,
    output reg [3:0] count
);

always @(posedge clk or posedge rst) begin
    if (rst) begin
        count <= 4'b0000;
    end else if (enable) begin
        count <= count + 1;
    end
end

endmodule`,
      },
      {
        name: 'counter_tb.v',
        type: 'testbench',
        content: `// Testbench for 4-bit Counter
\`timescale 1ns/1ps

module counter_tb;
    reg clk;
    reg rst;
    reg enable;
    wire [3:0] count;

    // Instantiate the counter
    counter uut (
        .clk(clk),
        .rst(rst),
        .enable(enable),
        .count(count)
    );

    // Generate clock
    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    // Test sequence
    initial begin
        // Initialize
        rst = 1;
        enable = 0;
        
        // Apply reset
        #10 rst = 0;
        
        // Enable counting
        #10 enable = 1;
        
        // Let it count for a while
        #100 enable = 1;
        
        // Test reset
        #20 rst = 1;
        #10 rst = 0;
        #10 enable = 1;
        
        #50 $finish;
    end

    // Monitor changes
    initial begin
        $monitor("Time=%0t, rst=%b, enable=%b, count=%d", 
                 $time, rst, enable, count);
    end

    // Generate VCD for waveform viewing
    initial begin
        $dumpfile("counter.vcd");
        $dumpvars(0, counter_tb);
    end

endmodule`,
      },
    ],
    mux: [
      {
        name: 'mux4to1.v',
        type: 'verilog',
        content: `// 4-to-1 Multiplexer
module mux4to1(
    input wire [3:0] data_in,
    input wire [1:0] select,
    output reg data_out
);

always @(*) begin
    case (select)
        2'b00: data_out = data_in[0];
        2'b01: data_out = data_in[1];
        2'b10: data_out = data_in[2];
        2'b11: data_out = data_in[3];
        default: data_out = 1'bx;
    endcase
end

endmodule`,
      },
      {
        name: 'mux4to1_tb.v',
        type: 'testbench',
        content: `// Testbench for 4-to-1 MUX
\`timescale 1ns/1ps

module mux4to1_tb;
    reg [3:0] data_in;
    reg [1:0] select;
    wire data_out;

    mux4to1 uut (
        .data_in(data_in),
        .select(select),
        .data_out(data_out)
    );

    initial begin
        // Test all combinations
        data_in = 4'b1010;
        
        select = 2'b00; #10;
        select = 2'b01; #10;
        select = 2'b10; #10;
        select = 2'b11; #10;
        
        // Change data and test again
        data_in = 4'b0101;
        select = 2'b00; #10;
        select = 2'b01; #10;
        select = 2'b10; #10;
        select = 2'b11; #10;
        
        $finish;
    end

    initial begin
        $monitor("Time=%0t, data_in=%b, select=%b, data_out=%b",
                 $time, data_in, select, data_out);
    end

    initial begin
        $dumpfile("mux4to1.vcd");
        $dumpvars(0, mux4to1_tb);
    end

endmodule`,
      },
    ],
    alu: [
      {
        name: 'alu.v',
        type: 'verilog',
        content: `// Simple ALU
module alu(
    input wire [7:0] a,
    input wire [7:0] b,
    input wire [2:0] op,
    output reg [7:0] result,
    output reg zero,
    output reg carry
);

always @(*) begin
    carry = 0;
    case (op)
        3'b000: {carry, result} = a + b;
        3'b001: {carry, result} = a - b;
        3'b010: result = a & b;
        3'b011: result = a | b;
        3'b100: result = a ^ b;
        3'b101: result = ~a;
        3'b110: result = a << 1;
        3'b111: result = a >> 1;
        default: result = 8'b0;
    endcase
    zero = (result == 8'b0);
end

endmodule`,
      },
      {
        name: 'alu_tb.v',
        type: 'testbench',
        content: `// Testbench for ALU
\`timescale 1ns/1ps

module alu_tb;
    reg [7:0] a, b;
    reg [2:0] op;
    wire [7:0] result;
    wire zero, carry;

    alu uut (
        .a(a), .b(b), .op(op),
        .result(result), .zero(zero), .carry(carry)
    );

    initial begin
        // Test ADD
        a = 8'h50; b = 8'h30; op = 3'b000; #10;
        
        // Test SUB
        op = 3'b001; #10;
        
        // Test AND
        a = 8'hFF; b = 8'h0F; op = 3'b010; #10;
        
        // Test OR
        op = 3'b011; #10;
        
        // Test XOR
        op = 3'b100; #10;
        
        // Test NOT
        a = 8'h55; op = 3'b101; #10;
        
        // Test Shift
        a = 8'h01; op = 3'b110; #10;
        op = 3'b111; #10;
        
        $finish;
    end

    initial begin
        $monitor("Time=%0t, a=%h, b=%h, op=%b, result=%h, zero=%b, carry=%b",
                 $time, a, b, op, result, zero, carry);
    end

    initial begin
        $dumpfile("alu.vcd");
        $dumpvars(0, alu_tb);
    end

endmodule`,
      },
    ],
    fsm: [
      {
        name: 'fsm.v',
        type: 'verilog',
        content: `// Simple Moore FSM - Traffic Light Controller
module traffic_light_fsm(
    input wire clk,
    input wire rst,
    input wire emergency,
    output reg [2:0] light // Green=001, Yellow=010, Red=100
);

parameter GREEN  = 2'b00;
parameter YELLOW = 2'b01;
parameter RED    = 2'b10;

reg [1:0] state, next_state;
reg [3:0] timer;

always @(posedge clk or posedge rst) begin
    if (rst) begin
        state <= GREEN;
        timer <= 0;
    } else begin
        state <= next_state;
        if (timer < 15) timer <= timer + 1;
        else timer <= 0;
    end
end

always @(*) begin
    if (emergency) begin
        next_state = RED;
    end else begin
        case (state)
            GREEN:  next_state = (timer == 10) ? YELLOW : GREEN;
            YELLOW: next_state = (timer == 3) ? RED : YELLOW;
            RED:    next_state = (timer == 15) ? GREEN : RED;
            default: next_state = GREEN;
        endcase
    end
end

always @(*) begin
    case (state)
        GREEN:  light = 3'b001;
        YELLOW: light = 3'b010;
        RED:    light = 3'b100;
        default: light = 3'b100;
    endcase
end

endmodule`,
      },
      {
        name: 'fsm_tb.v',
        type: 'testbench',
        content: `// Testbench for Traffic Light FSM
\`timescale 1ns/1ps

module traffic_light_fsm_tb;
    reg clk, rst, emergency;
    wire [2:0] light;

    traffic_light_fsm uut (
        .clk(clk),
        .rst(rst),
        .emergency(emergency),
        .light(light)
    );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        rst = 1;
        emergency = 0;
        #20 rst = 0;
        #200;
        emergency = 1;
        #50 emergency = 0;
        #200;
        $finish;
    end

    initial begin
        $monitor("Time=%0t, light=%b, emergency=%b",
                 $time, light, emergency);
    end

    initial begin
        $dumpfile("traffic_light.vcd");
        $dumpvars(0, traffic_light_fsm_tb);
    end

endmodule`,
      },
    ],
    dff: [
      {
        name: 'dff.v',
        type: 'verilog',
        content: `// D Flip-Flop with Synchronous Reset
module dff(
    input wire clk,
    input wire rst,
    input wire d,
    output reg q
);

always @(posedge clk) begin
    if (rst) begin
        q <= 1'b0;
    end else begin
        q <= d;
    end
end

endmodule`,
      },
      {
        name: 'dff_tb.v',
        type: 'testbench',
        content: `// Testbench for D Flip-Flop
\`timescale 1ns/1ps

module dff_tb;
    reg clk;
    reg rst;
    reg d;
    wire q;

    dff uut (
        .clk(clk),
        .rst(rst),
        .d(d),
        .q(q)
    );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        rst = 1; d = 0;
        #20 rst = 0;
        
        #10 d = 1;
        #10 d = 0;
        #10 d = 1;
        #10 rst = 1; // Test synchronous reset
        #10 rst = 0;
        #10 d = 0;
        
        #50 $finish;
    end

    initial begin
        $monitor("Time=%0t, rst=%b, d=%b, q=%b", $time, rst, d, q);
    end

    initial begin
        $dumpfile("dff.vcd");
        $dumpvars(0, dff_tb);
    end
endmodule`,
      },
    ],
    shift_reg: [
      {
        name: 'shift_reg.v',
        type: 'verilog',
        content: `// 4-bit Shift Register
module shift_reg(
    input wire clk,
    input wire rst,
    input wire load,
    input wire [3:0] din,
    input wire shift_in,
    output reg [3:0] q
);

always @(posedge clk or posedge rst) begin
    if (rst) begin
        q <= 4'b0000;
    end else if (load) begin
        q <= din;
    end else begin
        q <= {q[2:0], shift_in};
    end
end

endmodule`,
      },
      {
        name: 'shift_reg_tb.v',
        type: 'testbench',
        content: `// Testbench for Shift Register
\`timescale 1ns/1ps

module shift_reg_tb;
    reg clk;
    reg rst;
    reg load;
    reg [3:0] din;
    reg shift_in;
    wire [3:0] q;

    shift_reg uut (
        .clk(clk),
        .rst(rst),
        .load(load),
        .din(din),
        .shift_in(shift_in),
        .q(q)
    );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        rst = 1; load = 0; din = 4'b0000; shift_in = 0;
        #15 rst = 0;
        
        // Load data
        #10 load = 1; din = 4'b1011;
        #10 load = 0;
        
        // Shift in 1s and 0s
        #10 shift_in = 1;
        #10 shift_in = 0;
        #10 shift_in = 1;
        #10 shift_in = 1;
        
        #50 $finish;
    end

    initial begin
        $dumpfile("shift_reg.vcd");
        $dumpvars(0, shift_reg_tb);
    end
endmodule`,
      },
    ],
    memory: [
      {
        name: 'ram.v',
        type: 'verilog',
        content: `// Simple 16x8 Single-Port RAM
module ram(
    input wire clk,
    input wire we,          // Write enable
    input wire [3:0] addr,  // 4-bit address (16 locations)
    input wire [7:0] din,   // 8-bit data input
    output reg [7:0] dout   // 8-bit data output
);

    reg [7:0] mem [0:15];   // 16 words of 8 bits

    always @(posedge clk) begin
        if (we) begin
            mem[addr] <= din;
        end
        dout <= mem[addr]; // Read operations happen every clock
    end

endmodule`,
      },
      {
        name: 'ram_tb.v',
        type: 'testbench',
        content: `// Testbench for RAM
\`timescale 1ns/1ps

module ram_tb;
    reg clk;
    reg we;
    reg [3:0] addr;
    reg [7:0] din;
    wire [7:0] dout;

    ram uut (
        .clk(clk),
        .we(we),
        .addr(addr),
        .din(din),
        .dout(dout)
    );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        // Initialize
        we = 0; addr = 0; din = 0;
        #15;
        
        // Write data to address 5
        we = 1; addr = 4'h5; din = 8'hA5;
        #10;
        
        // Write data to address A
        we = 1; addr = 4'hA; din = 8'h3C;
        #10;
        
        // Read data back from 5
        we = 0; addr = 4'h5;
        #10;
        
        // Read data back from A
        we = 0; addr = 4'hA;
        #10;
        
        #50 $finish;
    end

    initial begin
        $dumpfile("ram.vcd");
        $dumpvars(0, ram_tb);
        // Option to dump memory array (some simulators support this, but usually not natively in VCD without loops)
        // For Icarus Verilog we could loop, but it's simpler to just dump the module.
    end
endmodule`,
      },
    ],
  };

  return templates[template] || templates.basic;
}
