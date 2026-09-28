# All-in-One Verisim IDE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Verisim into a unified all-in-one EDA Workstation featuring SystemVerilog IEEE 1800 support, multi-engine simulation and linting (Icarus Verilog + Verilator), native Python verification hub, offline AI Write Assist Studio with toggleable auto-suggestions, and pre-loaded interactive demos.

**Architecture:** 
1. **Rust Tauri Backend (`src-tauri/src/lib.rs`)**: Multi-engine runner executing `iverilog -g2012` for SystemVerilog event simulation, `verilator --lint-only -Wall` for deep static analysis, and `python3` runner for Python verification scripts.
2. **Integrated All-in-One Frontend**: Resizable multi-pane layout unifying Monaco Editor (Verilog, SystemVerilog, Python syntax + toggleable primitive highlights + inline auto-suggestions), Bottom Integrated Dock (Sim Console, Python Runner, VCD Waveform Viewer), Right AI Assist Studio (Testbench Gen, FSM Builder, Waveform Injector, Linter), and bottom Status Bar.
3. **Offline AI & Templates**: Zero-config client-side rule/AST engine for testbench scaffolding and smart completions, backed by ready-to-simulate Verilog, SystemVerilog, and Python verification demos.

**Tech Stack:** Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS, Monaco Editor, Zustand, Tauri 2.0 (Rust), Icarus Verilog 13.0, Verilator 5.052, Python 3.14.

**Spec:** [`docs/superpowers/specs/2026-09-28-all-in-one-ide-systemverilog-python-ai-design.md`](file:///home/mister/Documents/GitHub/Verisim/docs/superpowers/specs/2026-09-28-all-in-one-ide-systemverilog-python-ai-design.md)

## Global Constraints
- Code must compile with zero errors on `bun run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.
- All AI Write Assist features must run 100% locally and offline without external API keys or cloud dependencies.
- Auto-Suggestion mode must be toggleable (ON/OFF) via both UI toggle and `Alt+A` shortcut.
- Monaco editor must support syntax highlighting for `.v`, `.sv`, and `.py` files.
- Syntax highlighting for primitives and system tasks must be toggleable in settings.

---

### Task 1: Tauri Backend Multi-Engine (Icarus `-g2012` + Verilator) & Python Runner

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `VerilogFile { id, name, content, file_type, project_id }`
- Produces: 
  - `simulate(engine: String, files: Vec<VerilogFile>) -> Result<SimulationResult, String>`
  - `run_python(script_name: String, files: Vec<VerilogFile>, args: Vec<String>) -> Result<PythonResult, String>`

- [ ] **Step 1: Update Rust data structures and add `PythonResult` in `src-tauri/src/lib.rs`**

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct PythonResult {
    pub success: bool,
    pub output: String,
    pub exit_code: i32,
}
```

- [ ] **Step 2: Update `simulate` command to support `"iverilog"`, `"verilator"`, and `"both"` with SystemVerilog `-g2012` flag**

In `src-tauri/src/lib.rs`:
```rust
#[tauri::command]
async fn simulate(engine: Option<String>, files: Vec<VerilogFile>) -> Result<SimulationResult, String> {
    let chosen_engine = engine.unwrap_or_else(|| "iverilog".to_string());
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    
    let temp_dir = std::env::temp_dir().join(format!("verisim_{}", now));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let mut has_sv = false;
    for file in &files {
        if file.name.ends_with(".sv") || file.name.ends_with(".svh") {
            has_sv = true;
        }
        let file_path = temp_dir.join(&file.name);
        fs::write(file_path, &file.content).map_err(|e| e.to_string())?;
    }

    if chosen_engine == "verilator" {
        let mut verilator_cmd = Command::new("verilator");
        verilator_cmd.arg("--lint-only").arg("-Wall");
        if has_sv {
            verilator_cmd.arg("--sv");
        }
        for file in &files {
            if file.name.ends_with(".v") || file.name.ends_with(".sv") {
                verilator_cmd.arg(temp_dir.join(&file.name));
            }
        }
        let output = verilator_cmd.output().map_err(|e| format!("Failed to run verilator: {}", e))?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let full_output = format!("=== Verilator Lint Analysis ===\n{}{}", stdout, stderr);
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok(SimulationResult {
            success: output.status.success(),
            output: if full_output.trim() == "=== Verilator Lint Analysis ===" {
                "=== Verilator Lint Analysis ===\nNo lint warnings or syntax errors found. Design is clean!".to_string()
            } else {
                full_output
            },
            vcd_content: None,
        });
    }

    // Default: iverilog simulation
    let vvp_file = temp_dir.join("simulation.vvp");
    let mut compile_cmd = Command::new("iverilog");
    if has_sv {
        compile_cmd.arg("-g2012");
    }
    compile_cmd.arg("-o").arg(&vvp_file);
    for file in &files {
        if file.name.ends_with(".v") || file.name.ends_with(".sv") {
            compile_cmd.arg(temp_dir.join(&file.name));
        }
    }

    let compile_output = compile_cmd.output().map_err(|e| format!("Failed to run iverilog: {}", e))?;
    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok(SimulationResult {
            success: false,
            output: format!("=== Compilation Failed ===\n{}", stderr),
            vcd_content: None,
        });
    }

    let mut run_cmd = Command::new("vvp");
    run_cmd.arg(&vvp_file);
    run_cmd.current_dir(&temp_dir);

    let run_output = run_cmd.output().map_err(|e| format!("Failed to run vvp: {}", e))?;
    let stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&run_output.stderr).to_string();
    let full_output = format!("{}{}", stdout, stderr);

    let mut vcd_content = None;
    if let Ok(entries) = fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            if entry.path().extension().map_or(false, |ext| ext == "vcd") {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    vcd_content = Some(content);
                    break;
                }
            }
        }
    }

    let _ = fs::remove_dir_all(&temp_dir);

    Ok(SimulationResult {
        success: true,
        output: full_output,
        vcd_content,
    })
}
```

- [ ] **Step 3: Implement `run_python` command in `src-tauri/src/lib.rs`**

```rust
#[tauri::command]
async fn run_python(script_name: String, files: Vec<VerilogFile>, args: Vec<String>) -> Result<PythonResult, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    
    let temp_dir = std::env::temp_dir().join(format!("verisim_py_{}", now));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    for file in &files {
        let file_path = temp_dir.join(&file.name);
        fs::write(file_path, &file.content).map_err(|e| e.to_string())?;
    }

    let script_path = temp_dir.join(&script_name);
    let mut cmd = Command::new("python3");
    cmd.arg(&script_path);
    for arg in args {
        cmd.arg(arg);
    }
    cmd.current_dir(&temp_dir);

    let output = cmd.output().map_err(|e| format!("Failed to run python3: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    let full_output = if !stderr.is_empty() {
        format!("{}\n[stderr]:\n{}", stdout, stderr)
    } else {
        stdout
    };

    let _ = fs::remove_dir_all(&temp_dir);

    Ok(PythonResult {
        success: output.status.success(),
        output: full_output,
        exit_code,
    })
}
```

- [ ] **Step 4: Register `run_python` in Tauri builder handlers in `src-tauri/src/lib.rs`**

Update `tauri::generate_handler![open_project, save_project, simulate, run_python]`.

- [ ] **Step 5: Verify Rust compilation with cargo check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Finished dev profile, no errors.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(tauri): add multi-engine simulation and python runner commands"
```

---

### Task 2: Store State Expansion for All-in-One Multi-Engine, Python Hub, and Suggestion Toggle

**Files:**
- Modify: `src/store/ide-store.ts`
- Modify: `src/lib/tauri-db.ts`

**Interfaces:**
- Consumes: Zustand `create`
- Produces:
  - `useIDEStore` with fields: `selectedEngine`, `autoSuggestEnabled`, `highlightPrimitives`, `highlightSystemTasks`, `pythonResult`, `isPythonRunning`, `activeDockTab`, `isAiAssistOpen`.
  - `runSimulation(projectId, files, engine)`
  - `runPythonScript(scriptName, files, args)`

- [ ] **Step 1: Extend `ide-store.ts` with new state and actions**

In `src/store/ide-store.ts`, add:
```typescript
export type SimulationEngine = 'iverilog' | 'verilator' | 'both';
export type DockTab = 'console' | 'python' | 'waveform';

export interface PythonResult {
  success: boolean;
  output: string;
  exit_code: number;
}
```
Add to `IDEState`:
```typescript
  // Engine & Verification
  selectedEngine: SimulationEngine;
  setSelectedEngine: (engine: SimulationEngine) => void;
  pythonResult: PythonResult | null;
  isPythonRunning: boolean;
  setPythonRunning: (running: boolean) => void;
  setPythonResult: (result: PythonResult | null) => void;

  // Editor features & AI
  autoSuggestEnabled: boolean;
  setAutoSuggestEnabled: (enabled: boolean) => void;
  toggleAutoSuggest: () => void;
  highlightPrimitives: boolean;
  setHighlightPrimitives: (enabled: boolean) => void;
  highlightSystemTasks: boolean;
  setHighlightSystemTasks: (enabled: boolean) => void;

  // Layout & Docking
  activeDockTab: DockTab;
  setActiveDockTab: (tab: DockTab) => void;
  dockCollapsed: boolean;
  setDockCollapsed: (collapsed: boolean) => void;
  dockMaximized: boolean;
  setDockMaximized: (maximized: boolean) => void;
  isAiAssistOpen: boolean;
  setIsAiAssistOpen: (open: boolean) => void;
  toggleAiAssist: () => void;
```

- [ ] **Step 2: Update `tauri-db.ts` to support engine selection and python execution**

In `src/lib/tauri-db.ts`:
Update `runSimulation`:
```typescript
export async function runSimulation(projectId: string, files: any[], engine: string = 'iverilog') {
  try {
    const backendFiles = files.map(f => ({
      id: f.id,
      name: f.name,
      content: f.content,
      type: f.type,
      project_id: f.project_id || projectId
    }));
    const result = await invoke('simulate', { engine, files: backendFiles });
    return result;
  } catch (error) {
    return {
      success: false,
      output: `Simulation failed: ${error}`,
    };
  }
}

export async function runPythonScript(scriptName: string, files: any[], args: string[] = []) {
  try {
    const backendFiles = files.map(f => ({
      id: f.id,
      name: f.name,
      content: f.content,
      type: f.type,
      project_id: f.project_id || 'default'
    }));
    const result = await invoke<any>('run_python', { scriptName, files: backendFiles, args });
    return result;
  } catch (error) {
    return {
      success: false,
      output: `Python execution failed: ${error}`,
      exit_code: -1
    };
  }
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `bun run build`
Expected: Successful compile.

- [ ] **Step 4: Commit**

```bash
git add src/store/ide-store.ts src/lib/tauri-db.ts
git commit -m "feat(store): expand state for multi-engine, python runner, and AI assist"
```

---

### Task 3: Monaco Editor SystemVerilog Syntax, Configurable Primitive Highlighting & Auto-Suggestions

**Files:**
- Modify: `src/components/ide/CodeEditor.tsx`

**Interfaces:**
- Consumes: `useIDEStore` (`autoSuggestEnabled`, `highlightPrimitives`, `highlightSystemTasks`, `activeFile`)
- Produces: Monaco Verilog/SystemVerilog Monarch configuration + CompletionItemProvider with dynamic primitive highlighting and auto-suggest toggle.

- [ ] **Step 1: Define comprehensive SystemVerilog Monarch Tokens & Primitives**

In `src/components/ide/CodeEditor.tsx`:
Add SystemVerilog keywords (`logic`, `bit`, `always_comb`, `always_ff`, `always_latch`, `unique`, `priority`, `interface`, `package`, `struct`, `typedef`, `assert`, `cover`, `property`).
Add Gate Primitives list: `['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'buf', 'not', 'bufif0', 'bufif1', 'notif0', 'notif1', 'tran', 'primitive', 'table']`.
Add System Tasks list: `['$display', '$write', '$monitor', '$time', '$finish', '$stop', '$dumpfile', '$dumpvars', '$urandom', '$urandom_range', '$readmemh', '$readmemb']`.

- [ ] **Step 2: Register Monaco CompletionItemProvider hooked to `autoSuggestEnabled`**

Register completions for SystemVerilog constructs:
- `module ... endmodule`
- `always_ff @(posedge clk or negedge rst_n) begin ... end`
- `always_comb begin ... end`
- `$dumpfile("simulation.vcd"); $dumpvars(0, tb);`
- Parameterized FIFO skeleton
- Testbench clock and reset generator

When `useIDEStore.getState().autoSuggestEnabled` is false, provider immediately returns `{ suggestions: [] }`.

- [ ] **Step 3: Register `Alt+A` shortcut listener for instant auto-suggest toggling**

Add keyboard event listener in `CodeEditor` for `Alt+A` to invoke `toggleAutoSuggest()` and display a brief toast/notification.

- [ ] **Step 4: Verify build and editor rendering**

Run: `bun run build`
Expected: Next.js build passes cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/components/ide/CodeEditor.tsx
git commit -m "feat(editor): add SystemVerilog support, primitive highlight settings, and auto-suggest provider"
```

---

### Task 4: Offline AI Assist Studio (Right Drawer / Panel)

**Files:**
- Create: `src/components/ide/AIAssistStudio.tsx`
- Modify: `src/components/ide/IDELayout.tsx`

**Interfaces:**
- Consumes: `useIDEStore` (`activeFile`, `updateFileContent`, `openFile`, `currentProject`, `setProjectFiles`)
- Produces: `AIAssistStudio` component with:
  - Instant Testbench Generator
  - FSM State Machine Generator
  - Waveform Dumper Injector
  - Hardware Static Linter & Bug Explainer

- [ ] **Step 1: Implement AST/Regex Module Parser and Testbench Generator**

In `src/components/ide/AIAssistStudio.tsx`:
Implement `generateTestbench(moduleCode: string)`:
- Extracts `module <name> (<ports>)`
- Parses inputs, outputs, clock, and reset signals
- Builds matching `module <name>_tb;` with:
  - Regs for inputs, wires for outputs
  - UUT port-mapping instantiation
  - Clock generation initial block (`forever #5 clk = ~clk;`)
  - Reset and stimulus sequence
  - `$dumpfile("<name>.vcd"); $dumpvars(0, <name>_tb);`
- Provides button to "Create Testbench File" or "Insert in Editor".

- [ ] **Step 2: Implement FSM Builder and Waveform Dumper**

- FSM Builder: Generates 3-process SystemVerilog FSM with `typedef enum logic [1:0] { IDLE, RUN, DONE } state_t;`, `always_ff` state register, and `always_comb` next-state logic.
- Waveform Dumper: Detects if active file is a testbench missing `$dumpfile`/`$dumpvars` and automatically inserts standard VCD logging before `$finish`.

- [ ] **Step 3: Implement Hardware Linter & Explainer**

Scans for:
- Incomplete `case` statements causing inferred latches
- Inadvertent blocking `=` assignments inside clock `always @(posedge clk)`
- Missing reset condition in sequential blocks
Displays friendly explanation cards with one-click "Apply Fix".

- [ ] **Step 4: Verify component build**

Run: `bun run build`
Expected: Successful compile.

- [ ] **Step 5: Commit**

```bash
git add src/components/ide/AIAssistStudio.tsx
git commit -m "feat(ai): add offline AI Assist Studio with testbench gen, FSM builder, and linter"
```

---

### Task 5: Bottom Integrated Dock (Sim Console + Python Verification + Waveform Viewer)

**Files:**
- Create: `src/components/ide/IntegratedDock.tsx`
- Create: `src/components/ide/PythonOutput.tsx`
- Modify: `src/components/ide/ConsoleOutput.tsx`
- Modify: `src/components/ide/WaveformViewer.tsx`

**Interfaces:**
- Consumes: `useIDEStore` (`activeDockTab`, `setActiveDockTab`, `simulationResult`, `pythonResult`, `isSimulating`, `isPythonRunning`)
- Produces: `IntegratedDock` component containing unified tab switching, action buttons, and responsive height controls.

- [ ] **Step 1: Create `PythonOutput.tsx`**

Build component displaying:
- Script execution header with status badges (Exit code, execution time)
- Colored terminal stdout/stderr stream with font-mono styling
- "Run Script (⚡)", "Copy", and "Clear" buttons
- Helpful hint if no script has been executed yet.

- [ ] **Step 2: Create `IntegratedDock.tsx`**

Build container component:
- Tab navigation: `[ Console Output (⚡) ]`, `[ Python Verification (🐍) ]`, `[ Waveform Viewer (🌊) ]`
- Header tools: Maximize dock button, minimize dock button, and clear current tab
- Tab content switcher rendering `ConsoleOutput`, `PythonOutput`, or `WaveformViewer`.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/ide/IntegratedDock.tsx src/components/ide/PythonOutput.tsx
git commit -m "feat(dock): create unified bottom dock for simulation, python, and waveforms"
```

---

### Task 6: Top Control Bar Modernization, Engine Selector & Status Bar

**Files:**
- Modify: `src/components/ide/Toolbar.tsx`
- Create: `src/components/ide/StatusBar.tsx`
- Modify: `src/components/ide/IDELayout.tsx`

**Interfaces:**
- Consumes: `useIDEStore`
- Produces:
  - Top Control Bar with Run Sim, Run Python, Engine Selector (`iverilog` / `verilator`), Auto-Suggest pill toggle (`ON/OFF`), and Highlight options dropdown.
  - Bottom Status Bar showing active engine (`iverilog -g2012`), Python runtime (`3.14.7`), file coordinates, and suggestion status.
  - Fully assembled `IDELayout` coordinating sidebar, editor, AI assist drawer, dock, and status bar.

- [ ] **Step 1: Create `StatusBar.tsx`**

Displays:
- Left: Current Engine badge (`Icarus Verilog v13.0` / `Verilator v5.052`), Python version (`Python 3.14`)
- Center: Active file name, line/column indicator
- Right: Auto-Suggest mode status pill (`[✦ Auto-Suggest: ON / OFF]` click to toggle)

- [ ] **Step 2: Update `Toolbar.tsx`**

Add:
- Simulation Engine Select: `[ Engine: Icarus Verilog ▾ ]` (`iverilog`, `verilator`, `both`)
- "Run Python (⚡)" button (active when a `.py` file is selected or available)
- "Auto-Suggest" toggle button in top controls
- "AI Studio" drawer trigger button
- "Syntax Highlights" menu to toggle primitives / system tasks

- [ ] **Step 3: Update `IDELayout.tsx` to mount `IntegratedDock`, `AIAssistStudio`, and `StatusBar`**

Ensure resizable horizontal panels for Editor + AI Studio, and vertical panel for Editor + Integrated Dock, ending with the bottom `StatusBar`.

- [ ] **Step 4: Test build**

Run: `bun run build`
Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/ide/Toolbar.tsx src/components/ide/StatusBar.tsx src/components/ide/IDELayout.tsx
git commit -m "feat(layout): modernize toolbar, add status bar, and wire integrated all-in-one layout"
```

---

### Task 7: Pre-Loaded Templates & Interactive Demos (Verilog, SystemVerilog, Python Verification)

**Files:**
- Modify: `src/lib/tauri-db.ts`
- Modify: `src/components/ide/FileExplorer.tsx`
- Modify: `src/components/ide/WelcomeScreen.tsx`

**Interfaces:**
- Consumes: Templates in `tauri-db.ts`
- Produces:
  - New templates: `systemverilog_fifo`, `python_verification`, `verilog_alu`
  - File Explorer support for creating `.sv` and `.py` files with appropriate template boilerplate.

- [ ] **Step 1: Add SystemVerilog and Python Verification templates in `tauri-db.ts`**

Add:
1. `systemverilog_fifo`:
   - `fifo.sv`: Parameterized synchronous FIFO using `logic`, `always_ff`, `always_comb`, and SVA assertion (`assert property`).
   - `fifo_tb.sv`: SystemVerilog testbench with packet push/pop sequence and VCD dump.
2. `python_verification`:
   - `alu.sv`: 8-bit SystemVerilog ALU.
   - `alu_tb.sv`: Testbench reading test vectors from `vectors.hex`.
   - `verify.py`: Python script generating `vectors.hex`, running verification checks, and comparing against golden model.

- [ ] **Step 2: Update `FileExplorer.tsx` and `WelcomeScreen.tsx`**

- Add file type options for SystemVerilog (`.sv`) and Python (`.py`).
- Add one-click "Launch Demo" cards in `WelcomeScreen.tsx` for:
  - Verilog Classic Demo
  - SystemVerilog FIFO Demo
  - Python Hardware Verification Demo

- [ ] **Step 3: Test build**

Run: `bun run build`
Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tauri-db.ts src/components/ide/FileExplorer.tsx src/components/ide/WelcomeScreen.tsx
git commit -m "feat(templates): add SystemVerilog FIFO and Python verification demos"
```

---

### Task 8: End-to-End Build & Functional Verification

**Files:**
- Inspect & Test: Entire project

- [ ] **Step 1: Run complete Next.js production build**

Run: `bun run build`
Expected: 0 errors, successful static page generation.

- [ ] **Step 2: Run Tauri Rust backend check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Clean compilation, 0 warnings/errors.

- [ ] **Step 3: Verify simulation and python runner with system tools**

Run a test simulation with `iverilog -g2012` and test python script with `python3` to confirm zero regressions.

- [ ] **Step 4: Final commit and cleanup**

```bash
git add .
git commit -m "chore: complete verification of all-in-one IDE upgrade"
```
