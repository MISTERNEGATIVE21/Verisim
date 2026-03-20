module.exports=[33405,(e,t,r)=>{t.exports=e.x("child_process",()=>require("child_process"))},24868,(e,t,r)=>{t.exports=e.x("fs/promises",()=>require("fs/promises"))},46786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},59546,e=>{"use strict";var t=e.i(61444),r=e.i(61911),n=e.i(26582),a=e.i(31188),i=e.i(60201),o=e.i(84618),s=e.i(47135),l=e.i(98351),u=e.i(38290),d=e.i(27714),c=e.i(15653),p=e.i(15402),m=e.i(14188),h=e.i(54297),f=e.i(7257),g=e.i(93695);e.i(60120);var $=e.i(56869),v=e.i(93178),R=e.i(38322),b=e.i(33405),w=e.i(24361),E=e.i(24868),S=e.i(14747),x=e.i(46786);let C=(0,w.promisify)(b.exec);async function y(){try{return await C("which iverilog"),!0}catch{return!1}}async function N(e){let t=(0,S.join)((0,x.tmpdir)(),`verilog_${Date.now()}`);try{let{projectId:s,files:l,testbenchName:u}=await e.json();if(!l||0===l.length)return v.NextResponse.json({error:"No files provided"},{status:400});for(let e of(await (0,E.mkdir)(t,{recursive:!0}),l)){let r=(0,S.join)(t,e.name);await (0,E.writeFile)(r,e.content)}let d=l.find(e=>"testbench"===e.type||e.name.includes("_tb"));if(!d)return v.NextResponse.json({error:"No testbench file found. Please create a testbench file (e.g., module_tb.v)"},{status:400});if(!await y()){var r,n,a,i,o;let e,t,s,u,c,p,m=(r=l,s=(n=d.name).replace("_tb.v","").replace(".v",""),u=function(e){let t,r=[],n="!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`",a=0,i=/(reg|wire)\s+(?:\[([0-9]+):([0-9]+)\]\s+)?(\w+)/g;for(;null!==(t=i.exec(e));){let e=t[1],i=t[2]?parseInt(t[2]):0,o=Math.abs(i-(t[3]?parseInt(t[3]):0))+1,s=t[4];"uut"===s||"clk"===s&&r.some(e=>"clk"===e.name)||r.push({name:s,type:e,width:o,symbol:n[a++%n.length]})}return r.find(e=>"clk"===e.name)||r.unshift({name:"clk",type:"reg",width:1,symbol:"!"}),r}(r.find(e=>e.name===n)?.content||""),c=(e=(a=r).map(e=>e.content.toLowerCase()).join(" "),(t=a.map(e=>e.name.toLowerCase()).join(" ")).includes("counter")||e.includes("counter")?"counter":t.includes("mux")||e.includes("multiplexer")||e.includes("mux")?"mux":t.includes("alu")||e.includes("alu")?"alu":t.includes("fsm")||e.includes("traffic")||e.includes("state")?"fsm":"generic"),{output:function(e,t,r,n){let a="";switch(a+=`╔══════════════════════════════════════════════════════════════╗
`,a+=`║           VerilogSim IDE - Demo Simulation Mode              ║
`,a+=`╠══════════════════════════════════════════════════════════════╣
`,a+=`║  Note: Icarus Verilog not installed. Using demo simulator.   ║
`,a+=`╚══════════════════════════════════════════════════════════════╝

`,a+=`📂 Compiling Verilog files:
`,t.forEach(e=>{a+=`   ✓ ${e.name}
`}),a+=`
`,a+=`🔧 Parsing module: ${e}
`,a+=`📊 Detected signals: ${r.map(e=>e.name).join(", ")}

`,a+=`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,a+=`                         SIMULATION OUTPUT                       
`,a+=`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`,n){case"counter":a+=function(e){let t="";e.find(e=>"rst"===e.name),e.find(e=>"enable"===e.name),e.find(e=>"count"===e.name);let r=0,n=0,a=1,i=0;t+=`Initializing testbench...
Clock period: 10ns (5ns high, 5ns low)

[Phase 1: Reset]
  Time=${r}ns: rst=${a}, enable=${i}, count=${n}
`;for(let e=0;e<3;e++)r+=10,t+=`  Time=${r}ns: rst=${a}, enable=${i}, count=${n}
`;a=0,i=1,t+=`
[Phase 2: Counting enabled]
`;for(let e=0;e<12;e++)r+=10,n=(n+1)%16,t+=`  Time=${r}ns: rst=${a}, enable=${i}, count=${n} (${n.toString(16).toUpperCase()}h)
`;i=0,t+=`
[Phase 3: Counting disabled]
`;for(let e=0;e<3;e++)r+=10,t+=`  Time=${r}ns: rst=${a}, enable=${i}, count=${n}
`;return a=1,r+=10,n=0,t+=`
[Phase 4: Reset asserted]
  Time=${r}ns: rst=${a}, enable=${i}, count=${n}
`}(r);break;case"mux":a+=function(){let e="";e+=`Testing 4-to-1 Multiplexer

`;let t=["1010","0101","1100","0011"];for(let r=0;r<4;r++){let n=parseInt(t[r],2),a=n>>r&1;e+=`  Time=${10*r}ns: data_in=${t[r]} (${n}), select=${r}, data_out=${a}
`}e+=`
Changing data input pattern...
`;let r=["1111","0000","1010","0101"];for(let t=0;t<4;t++){let n=parseInt(r[t],2),a=n>>t&1;e+=`  Time=${(t+4)*10}ns: data_in=${r[t]} (${n}), select=${t}, data_out=${a}
`}return e}();break;case"alu":let i;a+=(i=`Testing ALU Operations

`,[{op:"ADD",code:"000",a:80,b:48,result:128},{op:"SUB",code:"001",a:80,b:48,result:32},{op:"AND",code:"010",a:255,b:15,result:15},{op:"OR",code:"011",a:240,b:15,result:255},{op:"XOR",code:"100",a:255,b:15,result:240},{op:"NOT",code:"101",a:85,b:0,result:170},{op:"SHL",code:"110",a:1,b:0,result:2},{op:"SHR",code:"111",a:2,b:0,result:1}].forEach((e,t)=>{i+=`  Time=${10*t}ns: op=${e.code} (${e.op}), a=0x${e.a.toString(16).toUpperCase().padStart(2,"0")}, b=0x${e.b.toString(16).toUpperCase().padStart(2,"0")} → result=0x${e.result.toString(16).toUpperCase().padStart(2,"0")}
`}),i);break;case"fsm":a+=function(){let e="",t=["GREEN","YELLOW","RED"],r=["001","010","100"],n=0,a=0;e+=`Traffic Light FSM Simulation

[Normal Operation]
`;for(let i=0;i<3;i++)for(let i=0;i<3;i++)e+=`  Time=${n}ns: state=${t[i]}, light=${r[i]}, emergency=${a}
`,n+=20;return a=1,n+=10,e+=`
[Emergency Mode Triggered]
  Time=${n}ns: state=RED, light=100, emergency=${a}
`,n+=50,a=0,e+=`
[Resuming Normal Operation]
  Time=${n}ns: emergency=${a}
`}();break;default:a+=function(e){let t="";t+=`Running generic testbench

`;for(let r=0;r<10;r++){let n=10*r,a=e.slice(0,4).map(e=>1===e.width?Math.random()>.5?"1":"0":Math.floor(Math.random()*Math.pow(2,e.width)).toString(16).toUpperCase()),i=e.slice(0,4).map((e,t)=>`${e.name}=${a[t]}`).join(", ");t+=`  Time=${n}ns: ${i}
`}return t}(r)}return a+=`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,a+=`✅ Simulation completed successfully
`,a+=`📈 VCD waveform data generated
`,a+=`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`}(s,r,u,c),vcdContent:(i=s,o=u,p=`$timescale 10ns / 1ns
$scope module ${i}_tb $end
`,o.forEach(e=>{1===e.width?p+=`$var wire 1 ${e.symbol} ${e.name} $end
`:p+=`$var wire ${e.width} ${e.symbol} ${e.name} [${e.width-1}:0] $end
`}),p+=`$upscope $end
`,p+=`$enddefinitions $end
`,p+=`$dumpvars
`,o.forEach(e=>{1===e.width?p+=`0${e.symbol}
`:p+=`b${"0".repeat(e.width)} ${e.symbol}
`}),p+=`$end
`,p+=function(e){let t="",r=e.find(e=>"clk"===e.name),n=e.find(e=>"count"===e.name),a=e.find(e=>"rst"===e.name),i=e.find(e=>"enable"===e.name),o=r?.symbol||"!",s=n?.symbol||"$",l=a?.symbol||'"',u=i?.symbol||"#",d=0,c=0,p=0;for(let e=0;e<50;e++)if(d=5*e,p=+(0===p),t+=`#${d}
${p}${o}
`,n&&1===p){let e=+(d<30),r=+(d>=30&&d<150);e?c=0:r&&(c=(c+1)%16),t+=`b${c.toString(2).padStart(4,"0")} ${s}
`,a&&(t+=`${e}${l}
`),i&&(t+=`${r}${u}
`)}return t}(o))});return v.NextResponse.json({success:!0,mock:!0,message:"Demo Mode - Icarus Verilog not installed",output:m.output,vcdContent:m.vcdContent,installationGuide:`INSTALL ICARUS VERILOG FOR YOUR SYSTEM:

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
After installation, restart VerilogSim IDE.`})}let c=(0,S.join)(t,"simulation.vvp");(0,S.join)(t,d.name.replace(".v",".vcd").replace("_tb",""));let p=l.map(e=>(0,S.join)(t,e.name)).join(" "),m=`iverilog -o "${c}" ${p}`;try{let{stdout:e,stderr:t}=await C(m,{timeout:3e4});if(t&&t.includes("error"))return v.NextResponse.json({success:!1,error:"Compilation failed",output:t})}catch(e){return v.NextResponse.json({success:!1,error:"Compilation failed",output:e.stderr||e.message})}try{let{stdout:e,stderr:r}=await C(`vvp "${c}"`,{timeout:6e4,cwd:t}),n=(await (0,E.readdir)(t)).find(e=>e.endsWith(".vcd")),a=null;if(n)try{a=await (0,E.readFile)((0,S.join)(t,n),"utf-8")}catch(e){console.error("Failed to read VCD file:",e)}return s&&await R.db.simulation.create({data:{projectId:s,status:"completed",output:e||r,vcdPath:n?(0,S.join)(t,n):null,startTime:new Date,endTime:new Date}}),v.NextResponse.json({success:!0,output:(e||"")+(r||""),vcdContent:a})}catch(e){return v.NextResponse.json({success:!1,error:"Simulation failed",output:e.stderr||e.message})}}catch(e){return console.error("Simulation error:",e),v.NextResponse.json({success:!1,error:"Simulation failed",output:e.message},{status:500})}finally{try{await (0,E.rm)(t,{recursive:!0,force:!0})}catch{}}}e.s(["POST",0,N],37714);var T=e.i(37714);let O=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/simulate/route",pathname:"/api/simulate",filename:"route",bundlePath:""},distDir:"next-build",relativeProjectDir:"",resolvedPagePath:"[project]/Documents/GitHub/Verisim/src/app/api/simulate/route.ts",nextConfigOutput:"",userland:T}),{workAsyncStorage:A,workUnitAsyncStorage:U,serverHooks:I}=O;async function P(e,t,n){n.requestMeta&&(0,a.setRequestMeta)(e,n.requestMeta),O.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let v="/api/simulate/route";v=v.replace(/\/index$/,"")||"/";let R=await O.prepare(e,t,{srcPage:v,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:b,params:w,nextConfig:E,parsedUrl:S,isDraftMode:x,prerenderManifest:C,routerServerContext:y,isOnDemandRevalidate:N,revalidateOnlyGenerated:T,resolvedPathname:A,clientReferenceManifest:U,serverActionsManifest:I}=R,P=(0,s.normalizeAppPath)(v),_=!!(C.dynamicRoutes[P]||C.routes[A]),D=async()=>((null==y?void 0:y.render404)?await y.render404(e,t,S,!1):t.end("This page could not be found"),null);if(_&&!x){let e=!!C.routes[A],t=C.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(E.adapterPath)return await D();throw new g.NoFallbackError}}let M=null;!_||O.isDev||x||(M="/index"===(M=A)?"/":M);let j=!0===O.isDev||!_,k=_&&!j;I&&U&&(0,o.setManifestsSingleton)({page:v,clientReferenceManifest:U,serverActionsManifest:I});let L=e.method||"GET",H=(0,i.getTracer)(),q=H.getActiveScopeSpan(),F=!!(null==y?void 0:y.isWrappedByNextServer),V=!!(0,a.getRequestMeta)(e,"minimalMode"),X=(0,a.getRequestMeta)(e,"incrementalCache")||await O.getIncrementalCache(e,E,C,V);null==X||X.resetRequestCache(),globalThis.__incrementalCache=X;let G={params:w,previewProps:C.preview,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:j,incrementalCache:X,cacheLifeProfiles:E.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,n,a)=>O.onRequestError(e,t,n,a,y)},sharedContext:{buildId:b}},K=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),W=u.NextRequestAdapter.fromNodeNextRequest(K,(0,u.signalFromNodeResponse)(t));try{let a,o=async e=>O.handle(W,G).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=H.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${L} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t),a&&a!==e&&(a.setAttribute("http.route",n),a.updateName(t))}else e.updateName(`${L} ${v}`)}),s=async a=>{var i,s;let l=async({previousCacheEntry:r})=>{try{if(!V&&N&&T&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await o(a);e.fetchMetrics=G.renderOpts.fetchMetrics;let s=G.renderOpts.pendingWaitUntil;s&&n.waitUntil&&(n.waitUntil(s),s=void 0);let l=G.renderOpts.collectedTags;if(!_)return await (0,p.sendResponse)(K,B,i,G.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(i.headers);l&&(t[f.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==G.renderOpts.collectedRevalidate&&!(G.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&G.renderOpts.collectedRevalidate,n=void 0===G.renderOpts.collectedExpire||G.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:G.renderOpts.collectedExpire;return{value:{kind:$.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await O.onRequestError(e,t,{routerKind:"App Router",routePath:v,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:N})},!1,y),t}},u=await O.handleResponse({req:e,nextConfig:E,cacheKey:M,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:N,revalidateOnlyGenerated:T,responseGenerator:l,waitUntil:n.waitUntil,isMinimalMode:V});if(!_)return null;if((null==u||null==(i=u.value)?void 0:i.kind)!==$.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(s=u.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});V||t.setHeader("x-nextjs-cache",N?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),x&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,m.fromNodeOutgoingHttpHeaders)(u.value.headers);return V&&_||d.delete(f.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,h.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(K,B,new Response(u.value.body,{headers:d,status:u.value.status||200})),null};F&&q?await s(q):(a=H.getActiveScopeSpan(),await H.withPropagatedContext(e.headers,()=>H.trace(d.BaseServerSpan.handleRequest,{spanName:`${L} ${v}`,kind:i.SpanKind.SERVER,attributes:{"http.method":L,"http.target":e.url}},s),void 0,!F))}catch(t){if(t instanceof g.NoFallbackError||await O.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:N})},!1,y),_)throw t;return await (0,p.sendResponse)(K,B,new Response(null,{status:500})),null}}e.s(["handler",0,P,"patchFetch",0,function(){return(0,n.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:U})},"routeModule",0,O,"serverHooks",0,I,"workAsyncStorage",0,A,"workUnitAsyncStorage",0,U],59546)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0yoddwi._.js.map