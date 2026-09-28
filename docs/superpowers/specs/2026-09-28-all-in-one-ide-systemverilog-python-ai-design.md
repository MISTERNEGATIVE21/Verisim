# Verisim All-in-One IDE: SystemVerilog, Python Verification Hub, Verilator & Offline AI Assist

**Date:** 2026-09-28  
**Author:** Antigravity & MISTERNEGATIVE21  
**Status:** Approved Design  

---

## 1. Overview & Goals
Verisim is evolving from a basic Verilog editor into a professional, high-performance, unified **All-in-One EDA Workstation**. This upgrade bakes together:
1. **Unified All-in-One UI/UX**: Monaco multi-tab editor, integrated bottom dock (Simulation Console, Python Verification Hub, Interactive VCD Waveform Viewer), right AI Assist studio drawer, and bottom status bar with engine/toggle badges.
2. **SystemVerilog (IEEE 1800) Support**: Full support for `.sv` and `.svh` files, syntax highlighting, language tokens, and automatic `-g2012` compiler integration.
3. **Multi-Engine Support (Icarus Verilog + Verilator)**: Baked-in support for both Icarus Verilog (v13.0 event-driven simulation & waveform dumping) and Verilator (v5.052 high-speed linting & static analysis), with a quick engine selector in the toolbar.
4. **Customizable Editor Syntax Highlighting**: Options to toggle syntax highlighting for gate primitives (`and`, `or`, `nand`, `buf`, etc.), system tasks (`$display`, `$finish`), and constants/types.
5. **Python Verification Hub**: Native execution of Python 3 scripts within the project workspace to generate stimulus vectors (`.hex` / `.mem`), execute verification checkers, and hook into Cocotb workflows.
6. **Offline / Zero-Config AI Write Assist & Auto-Suggestions**:
   - In-editor inline completions and ghost text with an immediate **ON / OFF toggle** in the toolbar & status bar (shortcut `Alt+A`).
   - Right-side AI Assist Studio with rule-based one-click generators: Instant Testbench Generator, FSM State Machine Builder, Auto Waveform Injector, and Hardware Bug Linter.
7. **Pre-Loaded Interactive Demos**: Ready-to-simulate starter projects for Verilog, SystemVerilog, and Python-driven verification.

---

## 2. Architecture & Components

```
+---------------------------------------------------------------------------------------------------------+
|                                              VERISIM IDE                                                |
+---------------------------------------------------------------------------------------------------------+
| Top Toolbar:                                                                                            |
| [Logo] [Project: Active] | [▶ Run Sim] [⚡ Run Python] | [Engine: Icarus / Verilator ▾] | [Auto-Suggest: ON] |
+------------------------+----------------------------------------------------+---------------------------+
| Left Sidebar           | Center Workspace (Monaco Editor)                   | Right Drawer (Collapsible)|
|                        | Tabs: [alu.sv] [alu_tb.sv] [verify.py]             | AI ASSIST STUDIO          |
| - Project Explorer     | - Syntax Highlighting (Verilog / SV / Python)      | - ⚡ Instant Testbench Gen |
|   - Design Files (.v)  | - Inline Auto-Suggestions (Toggleable)             | - 📐 FSM State Machine Gen|
|   - SystemVerilog (.sv)| - Primitive Highlight Settings                     | - 🌊 Auto Waveform Dumper |
|   - Python (.py)       | - Error/Warning Squiggle Diagnostics               | - 🔍 Static Lint Explainer|
|   - Testbenches        +----------------------------------------------------+---------------------------+
|   - Waveforms (.vcd)   | Bottom Integrated Dock (Tabbed, Resizable, Maximizable)                        |
| - Pre-Loaded Demos     | [ Console Output ]    [ Python Verification ]    [ Waveform Viewer ]            |
| - Highlight Settings   | - Icarus/Verilator logs - Python 3 stdout/stderr   - Interactive VCD traces     |
+------------------------+--------------------------------------------------------------------------------+
| Bottom Status Bar: Engine: iverilog -g2012 | Python: 3.14.7 | Ln 12, Col 4 | Auto-Suggest: Active (Alt+A) |
+---------------------------------------------------------------------------------------------------------+
```

### 2.1 UI / UX Modernization
* **Docking Layout**: Built using `react-resizable-panels` with responsive layouts for desktop and laptop screens.
* **Unified Dock**: Eliminates fragmented dialogs and floating panels by integrating the Console, Python Output, and Waveform Viewer as selectable tabs in the bottom pane.
* **Status Bar**: A sleek footer displaying current engine, active file type, line/column coordinates, simulation status, and the clickable Auto-Suggestion toggle pill.
* **Theme & Typography**: Curated dark slate aesthetic with crisp monospace fonts (`JetBrains Mono` / `Fira Code` fallbacks), color-coded file badges, and smooth animations.

---

## 3. Subsystem Specifications

### 3.1 SystemVerilog Support & Syntax Highlighting
* **File Extensions**: `.v`, `.sv`, `.svh`, `.vh`.
* **Monaco Monarch Tokens**:
  * Keywords: `logic`, `bit`, `byte`, `int`, `longint`, `shortint`, `always_comb`, `always_ff`, `always_latch`, `unique`, `priority`, `inside`, `interface`, `endinterface`, `modport`, `package`, `endpackage`, `struct`, `union`, `enum`, `typedef`, `assert`, `cover`, `property`, `sequence`.
  * Primitives: `and`, `nand`, `or`, `nor`, `xor`, `xnor`, `buf`, `not`, `bufif0`, `bufif1`, `notif0`, `notif1`, `tran`, `primitive`, `table`.
  * Builtins: `$display`, `$write`, `$monitor`, `$time`, `$realtime`, `$finish`, `$stop`, `$dumpfile`, `$dumpvars`, `$urandom`, `$urandom_range`, `$readmemh`, `$readmemb`.
* **Configurable Highlight Options**:
  * User can toggle `highlightPrimitives` (defaults to true). When disabled, primitives use normal font styling without highlighting.
  * User can toggle `highlightSystemTasks` (defaults to true).

### 3.2 Compilation & Simulation Engine (Rust Tauri Backend)
* **Backend Commands in `src-tauri/src/lib.rs`**:
  * `simulate(engine: String, files: Vec<VerilogFile>) -> Result<SimulationResult, String>`
    * **Engine `"iverilog"`**: Runs `iverilog -g2012 -o simulation.vvp <files>` and `vvp simulation.vvp`. Captures stdout, stderr, and reads generated `.vcd` files into the response.
    * **Engine `"verilator"`**: Runs `verilator --lint-only -Wall <files>`. Returns parsed warnings and errors for rapid static verification.
    * **Engine `"both"`**: Runs Verilator lint first. If no critical errors, runs Icarus simulation and returns both lint output and waveform data.
  * `run_python(script_name: String, files: Vec<VerilogFile>, args: Vec<String>) -> Result<PythonResult, String>`:
    * Writes current project files to a temporary sandbox directory.
    * Spawns `python3 <script_name> <args>`.
    * Returns stdout, stderr, exit code, and any newly produced data/hex files.

### 3.3 Offline AI Write Assist & Auto-Suggestions
* **Auto-Suggestion Mode Toggle**:
  * State stored in `useIDEStore` (`autoSuggestEnabled: boolean`).
  * Toggled via Control Bar button, Status Bar indicator, or `Alt+A`.
  * Registered as Monaco CompletionItemProvider:
    * Triggered on typing keywords or structural tokens.
    * Provides completions for `always_ff @(posedge clk or negedge rst_n)`, `always_comb`, module instantiation templates, `$dumpfile` setup, and signal definitions.
* **AI Assist Studio (Right Drawer)**:
  * **Testbench Generator**: Parses module name, inputs, outputs, clock, and reset from the active file AST/regex, and constructs a matching testbench with clock driver, reset cycle, and stimulus skeleton.
  * **FSM Generator**: Generates 3-process SystemVerilog/Verilog FSM templates with enum state definitions.
  * **Auto Waveform Dumper**: Injects `$dumpfile` and `$dumpvars` into testbench `initial` blocks if absent.
  * **Code Linter & Explainer**: Highlights common hardware bugs (e.g. unintended latch, bit-width mismatch, blocking assignments in sequential blocks) with one-click fix buttons.

### 3.4 Pre-Loaded Demos
1. **Verilog Demo (ALU & 4-bit Counter)**: Full design + testbench generating waveforms.
2. **SystemVerilog Demo (Parameterized FIFO)**: Modern SystemVerilog queue using `logic`, `always_ff`, `always_comb`, and assertion checks.
3. **Python Hardware Verification Demo**: Includes `alu.sv`, `alu_tb.sv`, and `generate_vectors.py` which computes random test vectors, saves them to a file, and validates simulation output against a Python reference model.

---

## 4. Error Handling & Edge Cases
* **Tool Availability**: If `verilator` or `python3` is not found in PATH or running in pure web mode, graceful fallback informative messages and simulated outputs are shown with installation instructions.
* **File Save & Concurrency**: Project state updates in Zustand store and serializes to disk atomically.
* **Process Timeout**: Simulation and Python executions enforce a timeout (e.g. 15 seconds) to prevent infinite loops from hanging the desktop UI.

---

## 5. Verification & Testing Plan
* **Build Verification**:
  * `bun run build`: Ensure Next.js frontend builds with zero TypeScript / lint errors.
  * `cargo check --manifest-path src-tauri/Cargo.toml`: Ensure Tauri backend compiles cleanly.
* **Functional Verification**:
  1. Load Verilog project template -> Run simulation with Icarus -> Verify console output and VCD waveform display.
  2. Create/load SystemVerilog (`.sv`) module with `logic` and `always_ff` -> Run simulation -> Verify `-g2012` compiles without syntax errors.
  3. Switch engine to Verilator -> Run lint check -> Verify Verilator diagnostics appear in the console.
  4. Run Python script demo -> Verify output appears in the Python Verification dock.
  5. Toggle Auto-Suggestions (ON/OFF) -> Verify Monaco completions enable/disable accordingly.
  6. Use AI Assist "Generate Testbench" on a module -> Verify correct testbench code is generated and can be simulated.
