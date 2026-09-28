# Verisim IDE: Activity Bar, Yosys Synthesis & Verilator Waveforms Design

**Date**: 2026-09-28  
**Status**: Approved Specification  
**Topic**: Left Navigation Activity Bar, Yosys Gate Synthesis UI, Verilator Waveform Tracing, and Toolbar Decluttering  

---

## 1. Executive Summary
This design specification addresses 4 key architectural improvements in Verisim IDE:
1. **Left Activity Bar & File Drawer**: Resolves missing file explorer access and adds a persistent VS Code-style activity bar (`Files`, `Synthesis`, `Waveforms`, `AI`) with an explicit sidebar toggle in the toolbar.
2. **Yosys Gate-Level Synthesis**: Adds a native Tauri Rust synthesis command invoking `yosys` to synthesize RTL into standard gate primitives (AND, OR, XOR, DFF, etc.) and a dedicated visual Synthesis UI with gate metric cards and netlist viewer.
3. **Verilator Waveform Generation**: Upgrades the Rust backend to compile SystemVerilog/Verilog testbenches via `verilator --binary --trace`, executing the simulation binary to generate `.vcd` waveform traces for the Waveform Viewer.
4. **Decluttered Top Toolbar**: Reorganizes the top header into a balanced 3-zone layout (Project & Files | Simulation & Synthesis Action Hub | View & System Controls).

---

## 2. Component Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Toolbar.tsx (3-Zone Clean Header)                                                              │
│ [☰] [Verisim IDE] [Project: FIFO_Demo] [Save] │ [Icarus/Verilator ▾] [▶ Run Sim] [⚡ Synth] │ [AI] [Theme] [⚙]│
├───────┬──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ACT.   │ SIDEBAR DRAWER       │ MAIN WORKSTATION                                                │
│BAR    │ (Files / Synth / ...) │                                                                 │
│[ 📁 ] │ ── PROJECT EXPLORER ──│  CodeEditor.tsx                                                 │
│[ ⚡ ] │  📄 fifo.sv          │  (Offline Monaco Editor with multi-tab support)                 │
│[ 📊 ] │  📄 fifo_tb.sv       │                                                                 │
│[ ✨ ] │  🐍 verify.py        │                                                                 │
│       │  [+ New File]        │                                                                 │
├───────┴──────────────────────┴─────────────────────────────────────────────────────────────────┤
│ IntegratedDock.tsx (Tabs: Sim Console | Waveform Viewer | Yosys Gate Synthesis | Python Output)│
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Left Activity Bar & Drawer
- **New Component**: `src/components/ide/ActivityBar.tsx`
  - 46px slim vertical bar pinned to the far left.
  - Icons with tooltips:
    - 📁 **Explorer** (`files`): Opens FileExplorer drawer.
    - ⚡ **Gate Synthesis** (`synth`): Opens Yosys Synthesis overview drawer.
    - 📊 **Waveform** (`waveform`): Focuses signal trace viewer.
    - ✨ **HDL Assistant** (`ai`): Toggles AI assist studio drawer.
  - Active tab highlighting with accent line indicator.
  - Clicking an active tab collapses the sidebar; clicking an inactive tab switches panels and opens the drawer.
- **Sidebar Drawer**:
  - Encapsulates `FileExplorer.tsx`, `SynthesisViewer.tsx`, or `AIAssistStudio.tsx` based on `activeActivityTab`.
  - Always expandable via persistent `[☰]` toggle button in `Toolbar.tsx` and `Ctrl+B` shortcut.
  - Default state: open on desktop (`w-64`), auto-collapses on mobile (`< 768px`).

### 2.2 Top Panel Navigation (`Toolbar.tsx`)
Reorganized into 3 distinct visual zones:
1. **Left Zone (Workspace & Project)**:
   - `[☰]` Sidebar collapse/expand button with tooltip `Toggle Sidebar (Ctrl+B)`.
   - Brand logo & title badge (`Verisim IDE`).
   - Current Project name pill with dirty indicator dot.
   - Quick action icon buttons: `New Project`, `Open (.vsm)`, `Save (Ctrl+S)`.
2. **Center Zone (Action Hub)**:
   - Single unified command container:
     - Engine select: `Icarus Verilog` / `Verilator 5.052`.
     - **Simulate** Button (`emerald-600`): Compiles HDL and auto-loads VCD waveform.
     - **Synthesize** Button (`violet-600`): Runs Yosys gate-level synthesis.
     - **Verify Python** Button (`amber-600`): Conditionally visible if `.py` testbench exists.
3. **Right Zone (Layout & Utility)**:
   - Waveform Layout Toggle (`Side-by-side` vs `Bottom Dock`).
   - AI Assist toggle.
   - Theme toggle (Light/Dark).
   - Keyboard Shortcuts dialog button.

---

## 3. Backend Implementation (`src-tauri/src/lib.rs`)

### 3.1 Verilator Waveform Tracing
Upgrades the `simulate` command:
- **Testbench Detection**: Inspects files for `$dumpfile` or `_tb` suffixes.
- **Trace Compilation**:
  ```bash
  verilator --binary --trace --trace-structs -Wall -Wno-fatal -Wno-WIDTHEXPAND -Wno-WIDTHTRUNC \
    --top-module <top_module> \
    --prefix Vsim \
    -Mdir <temp_dir>/obj_dir \
    <files>
  ```
- **Execution**: Runs `<temp_dir>/obj_dir/Vsim`.
- **VCD Ingestion**: Reads the produced `.vcd` file and returns `vcd_content: Some(vcd_text)` to the frontend.
- **Fallback**: If no testbench is found or execution fails, returns formatted compiler diagnostics.

### 3.2 Yosys RTL-to-Gate Synthesis
- **New Tauri Command**: `synthesize(files: Vec<VerilogFile>, top_module: Option<String>) -> Result<SynthesisResult, String>`
- **Data Structures**:
  ```rust
  #[derive(Debug, Serialize, Deserialize)]
  pub struct SynthesisResult {
      pub success: bool,
      pub output: String,
      pub gate_verilog: String,
      pub top_module: String,
      pub cell_counts: HashMap<String, usize>,
      pub wire_count: usize,
      pub bit_count: usize,
      pub public_wires: usize,
  }
  ```
- **Yosys Pipeline**:
  ```tcl
  read_verilog -sv <files>;
  hierarchy -check -top <top_module>;
  proc; opt; fsm; opt; memory; opt;
  techmap; opt;
  abc -g AND,NAND,OR,NOR,XOR,XNOR;
  opt; clean;
  stat;
  write_verilog -noattr synth_gates.v
  ```
- **Parsing**: Extracts cell usage numbers from `stat` output (mapping `$_AND_`, `$_OR_`, `$_XOR_`, `$_DFF_P_`, etc.) and reads `synth_gates.v`.

---

## 4. Synthesis Frontend UI (`SynthesisViewer.tsx`)

Rendered in the Bottom Dock under tab `Gate Synthesis` and accessible via Left Activity Bar `⚡`:
1. **Module Selector & Run Control**:
   - Auto-detects declared RTL modules (e.g. `counter`, `fifo_sync`, `alu`).
   - "Synthesize RTL" action button with loading state.
2. **Visual Logic Gate Cards**:
   - **AND / NAND**: Count badge & color.
   - **OR / NOR**: Count badge & color.
   - **XOR / XNOR**: Count badge & color.
   - **Sequential DFFs**: Number of registered state bits.
   - **Inverters & Buffers**: Logic inverter counts.
   - **Total Gate & Wire Complexity**: Summary metrics.
3. **Netlist Code Viewer**:
   - Tabbed view showing the synthesized gate-level Verilog netlist with syntax highlighting.
   - "Copy Netlist" and "Open as New File" buttons.

---

## 5. State Management Updates (`src/store/ide-store.ts`)

Adds the following fields to `IDEState`:
- `activeActivityTab: 'files' | 'synth' | 'waveform' | 'ai'`
- `setActiveActivityTab: (tab: 'files' | 'synth' | 'waveform' | 'ai') => void`
- `synthesisResult: SynthesisResult | null`
- `setSynthesisResult: (result: SynthesisResult | null) => void`
- `isSynthesizing: boolean`
- `setSynthesizing: (loading: boolean) => void`

---

## 6. Verification & Test Plan
1. **Activity Bar & Sidebar**:
   - Click each icon (`Files`, `Synthesis`, `Waveform`, `AI`); verify the correct drawer opens.
   - Click active icon; verify drawer collapses cleanly.
   - Test header `[☰]` toggle and `Ctrl+B` shortcut on desktop and mobile viewports.
2. **Verilator Waveforms**:
   - Open `Counter_Waveform_Demo` or `SV_FIFO_Demo`.
   - Select `Verilator` engine and click `Simulate`.
   - Verify Verilator compiles, runs binary, and renders waveform traces in Waveform Viewer.
3. **Yosys Synthesis**:
   - Open a project, click `⚡ Synthesize`.
   - Verify gate counts appear (AND, OR, XOR, DFF) and gate-level netlist is displayed.
   - If Yosys is absent, verify clean diagnostic message is presented.
4. **Toolbar Layout**:
   - Verify responsive behavior at different window widths without wrapping or visual clutter.
