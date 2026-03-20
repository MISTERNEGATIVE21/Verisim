module.exports=[32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},25038,(e,t,r)=>{t.exports=e.x("@prisma/client-a016982c8f734728",()=>require("@prisma/client-a016982c8f734728"))},38322,e=>{"use strict";var t=e.i(25038);let r=globalThis.prisma??new t.PrismaClient({log:["query"]});e.s(["db",0,r])},41625,e=>{"use strict";var t=e.i(61444),r=e.i(61911),n=e.i(26582),a=e.i(31188),i=e.i(60201),s=e.i(84618),o=e.i(47135),l=e.i(98351),u=e.i(38290),c=e.i(27714),d=e.i(15653),p=e.i(15402),b=e.i(14188),m=e.i(54297),g=e.i(7257),h=e.i(93695);e.i(60120);var f=e.i(56869),x=e.i(93178),R=e.i(38322);async function v(){try{let e=await R.db.project.findMany({include:{files:!0},orderBy:{updatedAt:"desc"}});return x.NextResponse.json(e)}catch(e){return console.error("Error fetching projects:",e),x.NextResponse.json({error:"Failed to fetch projects"},{status:500})}}async function y(e){try{var t;let r,{name:n,description:a,template:i}=await e.json(),s=await R.db.project.create({data:{name:n,description:a,files:{create:"none"===i?[{name:"main.v",type:"verilog",content:"// New Verilog file\nmodule main();\n\nendmodule"}]:(t=i||"basic",(r={basic:[{name:"counter.v",type:"verilog",content:`// 4-bit Counter Example
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

endmodule`},{name:"counter_tb.v",type:"testbench",content:`// Testbench for 4-bit Counter
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

endmodule`}],mux:[{name:"mux4to1.v",type:"verilog",content:`// 4-to-1 Multiplexer
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

endmodule`},{name:"mux4to1_tb.v",type:"testbench",content:`// Testbench for 4-to-1 MUX
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

endmodule`}],alu:[{name:"alu.v",type:"verilog",content:`// Simple ALU
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

endmodule`},{name:"alu_tb.v",type:"testbench",content:`// Testbench for ALU
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

endmodule`}],fsm:[{name:"fsm.v",type:"verilog",content:`// Simple Moore FSM - Traffic Light Controller
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

endmodule`},{name:"fsm_tb.v",type:"testbench",content:`// Testbench for Traffic Light FSM
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

endmodule`}]})[t]||r.basic)}},include:{files:!0}});return x.NextResponse.json(s)}catch(e){return console.error("Error creating project:",e),x.NextResponse.json({error:"Failed to create project"},{status:500})}}async function w(e){try{let{searchParams:t}=new URL(e.url),r=t.get("id");if(!r)return x.NextResponse.json({error:"Project ID required"},{status:400});return await R.db.project.delete({where:{id:r}}),x.NextResponse.json({success:!0})}catch(e){return console.error("Error deleting project:",e),x.NextResponse.json({error:"Failed to delete project"},{status:500})}}e.s(["DELETE",0,w,"GET",0,v,"POST",0,y],60735);var E=e.i(60735);let _=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/projects/route",pathname:"/api/projects",filename:"route",bundlePath:""},distDir:"next-build",relativeProjectDir:"",resolvedPagePath:"[project]/Documents/GitHub/Verisim/src/app/api/projects/route.ts",nextConfigOutput:"",userland:E}),{workAsyncStorage:T,workUnitAsyncStorage:N,serverHooks:C}=_;async function j(e,t,n){n.requestMeta&&(0,a.setRequestMeta)(e,n.requestMeta),_.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let x="/api/projects/route";x=x.replace(/\/index$/,"")||"/";let R=await _.prepare(e,t,{srcPage:x,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:v,params:y,nextConfig:w,parsedUrl:E,isDraftMode:T,prerenderManifest:N,routerServerContext:C,isOnDemandRevalidate:j,revalidateOnlyGenerated:k,resolvedPathname:A,clientReferenceManifest:O,serverActionsManifest:S}=R,D=(0,o.normalizeAppPath)(x),$=!!(N.dynamicRoutes[D]||N.routes[A]),q=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,E,!1):t.end("This page could not be found"),null);if($&&!T){let e=!!N.routes[A],t=N.dynamicRoutes[D];if(t&&!1===t.fallback&&!e){if(w.adapterPath)return await q();throw new h.NoFallbackError}}let P=null;!$||_.isDev||T||(P="/index"===(P=A)?"/":P);let L=!0===_.isDev||!$,M=$&&!L;S&&O&&(0,s.setManifestsSingleton)({page:x,clientReferenceManifest:O,serverActionsManifest:S});let U=e.method||"GET",I=(0,i.getTracer)(),H=I.getActiveScopeSpan(),F=!!(null==C?void 0:C.isWrappedByNextServer),G=!!(0,a.getRequestMeta)(e,"minimalMode"),z=(0,a.getRequestMeta)(e,"incrementalCache")||await _.getIncrementalCache(e,w,N,G);null==z||z.resetRequestCache(),globalThis.__incrementalCache=z;let B={params:y,previewProps:N.preview,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:L,incrementalCache:z,cacheLifeProfiles:w.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,n,a)=>_.onRequestError(e,t,n,a,C)},sharedContext:{buildId:v}},K=new l.NodeNextRequest(e),W=new l.NodeNextResponse(t),V=u.NextRequestAdapter.fromNodeNextRequest(K,(0,u.signalFromNodeResponse)(t));try{let a,s=async e=>_.handle(V,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=I.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${U} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t),a&&a!==e&&(a.setAttribute("http.route",n),a.updateName(t))}else e.updateName(`${U} ${x}`)}),o=async a=>{var i,o;let l=async({previousCacheEntry:r})=>{try{if(!G&&j&&k&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await s(a);e.fetchMetrics=B.renderOpts.fetchMetrics;let o=B.renderOpts.pendingWaitUntil;o&&n.waitUntil&&(n.waitUntil(o),o=void 0);let l=B.renderOpts.collectedTags;if(!$)return await (0,p.sendResponse)(K,W,i,B.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,b.toNodeOutgoingHttpHeaders)(i.headers);l&&(t[g.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,n=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:f.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await _.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:j})},!1,C),t}},u=await _.handleResponse({req:e,nextConfig:w,cacheKey:P,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:j,revalidateOnlyGenerated:k,responseGenerator:l,waitUntil:n.waitUntil,isMinimalMode:G});if(!$)return null;if((null==u||null==(i=u.value)?void 0:i.kind)!==f.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(o=u.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});G||t.setHeader("x-nextjs-cache",j?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),T&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,b.fromNodeOutgoingHttpHeaders)(u.value.headers);return G&&$||c.delete(g.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,m.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(K,W,new Response(u.value.body,{headers:c,status:u.value.status||200})),null};F&&H?await o(H):(a=I.getActiveScopeSpan(),await I.withPropagatedContext(e.headers,()=>I.trace(c.BaseServerSpan.handleRequest,{spanName:`${U} ${x}`,kind:i.SpanKind.SERVER,attributes:{"http.method":U,"http.target":e.url}},o),void 0,!F))}catch(t){if(t instanceof h.NoFallbackError||await _.onRequestError(e,t,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:j})},!1,C),$)throw t;return await (0,p.sendResponse)(K,W,new Response(null,{status:500})),null}}e.s(["handler",0,j,"patchFetch",0,function(){return(0,n.patchFetch)({workAsyncStorage:T,workUnitAsyncStorage:N})},"routeModule",0,_,"serverHooks",0,C,"workAsyncStorage",0,T,"workUnitAsyncStorage",0,N],41625)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0-g5xin._.js.map