module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/Downloads/verilogallzip (2)/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/Downloads/verilogallzip (2)/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: [
        'query'
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = db;
}),
"[project]/Downloads/verilogallzip (2)/src/app/api/projects/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Downloads/verilogallzip (2)/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Downloads/verilogallzip (2)/src/lib/db.ts [app-route] (ecmascript)");
;
;
async function GET() {
    try {
        const projects = await __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].project.findMany({
            include: {
                files: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch projects'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { name, description, template } = body;
        const project = await __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].project.create({
            data: {
                name,
                description,
                files: {
                    create: template === 'none' ? [
                        {
                            name: 'main.v',
                            type: 'verilog',
                            content: '// New Verilog file\nmodule main();\n\nendmodule'
                        }
                    ] : getTemplateFiles(template || 'basic')
                }
            },
            include: {
                files: true
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to create project'
        }, {
            status: 500
        });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Project ID required'
            }, {
                status: 400
            });
        }
        await __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].project.delete({
            where: {
                id
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Downloads$2f$verilogallzip__$28$2$292f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to delete project'
        }, {
            status: 500
        });
    }
}
function getTemplateFiles(template) {
    const templates = {
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

endmodule`
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
        #100 enable = 0;
        
        // Test reset
        #20 rst = 1;
        #10 rst = 0;
        #10 enable = 1;
        
        // Finish simulation
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

endmodule`
            }
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

endmodule`
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

endmodule`
            }
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

// Operation codes:
// 000 - ADD
// 001 - SUB
// 010 - AND
// 011 - OR
// 100 - XOR
// 101 - NOT (uses only 'a')
// 110 - Shift Left
// 111 - Shift Right

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

endmodule`
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

endmodule`
            }
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

// State encoding
parameter GREEN  = 2'b00;
parameter YELLOW = 2'b01;
parameter RED    = 2'b10;

reg [1:0] state, next_state;
reg [3:0] timer;

// State transition
always @(posedge clk or posedge rst) begin
    if (rst) begin
        state <= GREEN;
        timer <= 0;
    end else begin
        state <= next_state;
        if (timer < 15) timer <= timer + 1;
        else timer <= 0;
    end
end

// Next state logic
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

// Output logic
always @(*) begin
    case (state)
        GREEN:  light = 3'b001;
        YELLOW: light = 3'b010;
        RED:    light = 3'b100;
        default: light = 3'b100;
    endcase
end

endmodule`
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

    // Clock generation
    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        // Initialize
        rst = 1;
        emergency = 0;
        #20 rst = 0;
        
        // Run normal operation
        #200;
        
        // Test emergency
        emergency = 1;
        #50 emergency = 0;
        
        // Run more cycles
        #200;
        
        $finish;
    end

    initial begin
        $monitor("Time=%0t, state=%b, light=%b, emergency=%b",
                 $time, uut.state, light, emergency);
    end

    initial begin
        $dumpfile("traffic_light.vcd");
        $dumpvars(0, traffic_light_fsm_tb);
    end

endmodule`
            }
        ]
    };
    return templates[template] || templates.basic;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ugy_h9._.js.map