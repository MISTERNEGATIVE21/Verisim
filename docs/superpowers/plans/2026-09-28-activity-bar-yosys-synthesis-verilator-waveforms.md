# Verisim IDE: Activity Bar, Yosys Synthesis & Verilator Waveforms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a VS Code-style Left Activity Bar + Drawer, native Yosys gate-level synthesis engine with visual logic gate metrics, Verilator waveform tracing in demos, and an uncluttered 3-zone top toolbar.

**Architecture:** Extend Tauri Rust backend with `synthesize` command and Verilator `--binary --trace` simulation; introduce `ActivityBar.tsx` and `SynthesisViewer.tsx` to the layout; reorganize `Toolbar.tsx` into 3 balanced zones (Project | Action Hub | Utility).

**Tech Stack:** Rust (Tauri v2), Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS, Lucide icons, Yosys, Verilator 5+, Icarus Verilog.

**Spec:** `docs/superpowers/specs/2026-09-28-activity-bar-yosys-synthesis-verilator-waveforms-design.md`

## Global Constraints
- Standalone desktop app (Tauri v2 custom protocol `tauri://localhost`), no open ports or dev server dependencies.
- 100% offline Monaco Editor bundling via `loader.config({ monaco })`.
- Use native platform commands (`yosys`, `verilator`, `iverilog`) without arbitrary path abstractions.
- Preserve all existing file persistence and testbench simulation functionality.

## Review Focus
- Yosys missing from system PATH returns a friendly, non-crashing diagnostic message with copyable install command.
- Verilator projects without a testbench cleanly fall back to lint mode without crashing.
- Activity Bar drawer toggle respects window resizing and mobile breakpoints (< 768px).
- Synthesis gate cell parser handles various Yosys cell naming conventions (`$_AND_`, `$_OR_`, `$_DFF_P_`, etc.).
- Editor Error Boundary continues to protect Monaco from unhandled WebKitGTK worker exceptions.

---

### Task 1: Store & Data Layer Extensions

**Files:**
- Modify: `src/store/ide-store.ts`
- Modify: `src/lib/tauri-db.ts`

**Interfaces:**
- Produces: `SynthesisResult` interface, `activeActivityTab: 'files' | 'synth' | 'waveform' | 'ai'`, `synthesisResult`, `isSynthesizing`, `synthesizeRTL(files, topModule)` helper.

- [ ] **Step 1: Define `SynthesisResult` interface and store types in `src/store/ide-store.ts`**
  - Add `activeActivityTab: 'files' | 'synth' | 'waveform' | 'ai'`
  - Add `setActiveActivityTab: (tab: 'files' | 'synth' | 'waveform' | 'ai') => void`
  - Add `synthesisResult: SynthesisResult | null`
  - Add `setSynthesisResult: (result: SynthesisResult | null) => void`
  - Add `isSynthesizing: boolean`
  - Add `setSynthesizing: (loading: boolean) => void`

- [ ] **Step 2: Add `SynthesisResult` interface and `synthesizeRTL` bridge in `src/lib/tauri-db.ts`**
  - Implement `export async function synthesizeRTL(files: any[], topModule?: string)` invoking Tauri command `'synthesize'`.

- [ ] **Step 3: Verify TypeScript compiles**
  - Run: `npx tsc --noEmit`
  - Expected: Code 0 (No type errors).

- [ ] **Step 4: Commit**
  ```bash
  git add src/store/ide-store.ts src/lib/tauri-db.ts
  git commit -m "feat(store): add activity tab and synthesis state management"
  ```

---

### Task 2: Backend Tauri Commands — Verilator Tracing & Yosys Synthesis

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `VerilogFile`
- Produces: `synthesize` Tauri command, upgraded `simulate` command with Verilator tracing.

- [ ] **Step 1: Implement `SynthesisResult` struct in `src-tauri/src/lib.rs`**
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

- [ ] **Step 2: Implement `synthesize` command with Yosys invocation and stat parsing**
  - Write temporary design files to `temp_dir`.
  - Auto-detect top module or use specified module.
  - Run Yosys script with `hierarchy`, `proc`, `opt`, `fsm`, `memory`, `techmap`, `abc -g AND,NAND,OR,NOR,XOR,XNOR`, `stat`, and `write_verilog`.
  - Parse cell counts (`$_AND_`, `$_OR_`, `$_XOR_`, `$_DFF_P_`, etc.) and wire metrics from Yosys `stat` output.
  - Read `synth_gates.v`.
  - Gracefully handle `yosys` not found error.

- [ ] **Step 3: Upgrade `simulate` command for Verilator waveform tracing**
  - When `chosen_engine == "verilator"`:
    - Check if any file contains `$dumpfile` or has `_tb` / testbench characteristics.
    - If testbench found: compile with `verilator --binary --trace --trace-structs -Wall -Wno-fatal -Wno-WIDTHEXPAND -Wno-WIDTHTRUNC --top-module <top> -Mdir <temp>/obj_dir <files>`.
    - Run generated binary `./obj_dir/V<top>` to produce `.vcd`.
    - Read `.vcd` file into `vcd_content: Some(vcd_text)`.
    - If lint only or no testbench: run `verilator --lint-only`.

- [ ] **Step 4: Register `synthesize` in Tauri invoke handler**
  ```rust
  .invoke_handler(tauri::generate_handler![
      open_project,
      save_project,
      simulate,
      run_python,
      synthesize
  ])
  ```

- [ ] **Step 5: Verify Rust compilation**
  - Run: `cargo check --manifest-path src-tauri/Cargo.toml`
  - Expected: Code 0.

- [ ] **Step 6: Commit**
  ```bash
  git add src-tauri/src/lib.rs
  git commit -m "feat(tauri): add yosys synthesis command and verilator trace simulation"
  ```

---

### Task 3: Left Activity Bar & Drawer Component

**Files:**
- Create: `src/components/ide/ActivityBar.tsx`
- Modify: `src/components/ide/IDELayout.tsx`

**Interfaces:**
- Consumes: `activeActivityTab`, `setActiveActivityTab`, `sidebarCollapsed`, `setSidebarCollapsed`.
- Produces: `ActivityBar` component rendered in `IDELayout`.

- [ ] **Step 1: Create `src/components/ide/ActivityBar.tsx`**
  - 46px slim vertical bar on left edge.
  - Navigation icons:
    - 📁 `files`: Project Files Explorer
    - ⚡ `synth`: RTL Gate Synthesis
    - 📊 `waveform`: Waveform Traces
    - ✨ `ai`: HDL Assistant Studio
  - Handle tab switching:
    - If clicking inactive tab: set active tab and uncollapse sidebar.
    - If clicking active tab: toggle `sidebarCollapsed`.
  - Tooltips and active accent border on each button.

- [ ] **Step 2: Update `src/components/ide/IDELayout.tsx`**
  - Place `<ActivityBar />` to the left of the sidebar drawer.
  - Render drawer content based on `activeActivityTab`:
    - `files` -> `<FileExplorer />`
    - `synth` -> `<SynthesisViewer variant="drawer" />`
    - `ai` -> `<AIAssistStudio />`
  - Ensure drawer smoothly expands and collapses without affecting code editor layout.

- [ ] **Step 3: Verify TypeScript and compilation**
  - Run: `npx tsc --noEmit`
  - Expected: Code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/ide/ActivityBar.tsx src/components/ide/IDELayout.tsx
  git commit -m "feat(ui): add activity bar and dynamic drawer switching"
  ```

---

### Task 4: Gate-Level Synthesis Viewer Component

**Files:**
- Create: `src/components/ide/SynthesisViewer.tsx`
- Modify: `src/components/ide/IntegratedDock.tsx`

**Interfaces:**
- Consumes: `synthesisResult`, `isSynthesizing`, `synthesizeRTL`, `currentProject`.
- Produces: `<SynthesisViewer />` component rendered in Dock and Drawer.

- [ ] **Step 1: Create `src/components/ide/SynthesisViewer.tsx`**
  - Header: Module detection & selection dropdown, "Run Synthesis" button with loading state.
  - Logic Gate Cards Grid:
    - 🟦 AND / NAND gates count
    - 🟩 OR / NOR gates count
    - 🟪 XOR / XNOR gates count
    - 🟧 Flip-Flops & Latches (`$_DFF_P_`, etc.)
    - 🟨 Inverters & Buffers
    - 🔷 Total Wires & Bits
  - Netlist Viewer Tab: Syntax-highlighted synthesized gate-level Verilog code with "Copy Netlist" button.
  - Cell Hierarchy Table: Detailed list of synthesized cell instances and port connectivity.
  - Empty & error state handling (with installation tip if Yosys is missing).

- [ ] **Step 2: Add `Gate Synthesis` tab to `src/components/ide/IntegratedDock.tsx`**
  - Add tab button with ⚡ icon and cell count badge.
  - Render `<SynthesisViewer variant="dock" />` when active.

- [ ] **Step 3: Verify TypeScript**
  - Run: `npx tsc --noEmit`
  - Expected: Code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/ide/SynthesisViewer.tsx src/components/ide/IntegratedDock.tsx
  git commit -m "feat(ui): add visual gate synthesis viewer and dock tab"
  ```

---

### Task 5: Declutter & Reorganize Top Toolbar

**Files:**
- Modify: `src/components/ide/Toolbar.tsx`

**Interfaces:**
- Consumes: `sidebarCollapsed`, `setSidebarCollapsed`, `currentProject`, `selectedEngine`, `isSimulating`, `isSynthesizing`, `synthesizeRTL`.
- Produces: Clean 3-zone workstation header.

- [ ] **Step 1: Reorganize `Toolbar.tsx` into 3 zones**
  - **Left Zone**:
    - Sidebar toggle button `[☰]` with `title="Toggle Sidebar (Ctrl+B)"`.
    - Brand logo + "Verisim IDE" title.
    - Active project pill with dirty indicator dot.
    - Primary file buttons: `New`, `Open`, `Save (Ctrl+S)`.
  - **Center Zone (Action Hub)**:
    - Unified pill grouping:
      - Engine Selector (`Icarus` / `Verilator`).
      - **Simulate** Button (Emerald `bg-emerald-600 hover:bg-emerald-700`).
      - **Synthesize** Button (Violet `bg-violet-600 hover:bg-violet-700`).
      - **Run Python** Button (Amber, visible if `.py` exists).
  - **Right Zone**:
    - Waveform Layout split toggle (`Columns2` icon).
    - AI Assistant toggle (`Sparkles` icon).
    - Theme toggle (`ThemeToggle`).
    - Keyboard Shortcuts dialog button (`Keyboard` icon).

- [ ] **Step 2: Connect toolbar "Synthesize" button to `synthesizeRTL`**
  - Clicking Synthesize triggers synthesis, updates `synthesisResult`, opens the synthesis dock tab, and displays toast notification.

- [ ] **Step 3: Verify TypeScript and compilation**
  - Run: `npx tsc --noEmit`
  - Expected: Code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/ide/Toolbar.tsx
  git commit -m "feat(ui): declutter top toolbar into 3-zone action hub"
  ```

---

### Task 6: Packaging, Verification & Release

**Files:**
- Verify: Full codebase
- Build: `src-tauri/target/release/app`, `src-tauri/target/release/bundle/appimage/verisim-ide_6.0.1_amd64.AppImage`

- [ ] **Step 1: Run frontend static build**
  - Run: `bun run build`
  - Expected: Next.js static pages compiled successfully.

- [ ] **Step 2: Build release binary and AppImage**
  - Run: `bun run build:appimage`
  - Expected: Bundle generated at `src-tauri/target/release/bundle/appimage/verisim-ide_6.0.1_amd64.AppImage`.

- [ ] **Step 3: Verify desktop launch & manual feature test**
  - Launch `./src-tauri/target/release/app`.
  - Test Activity Bar clicking (Files, Synthesis, Waveforms, AI).
  - Test top toolbar `[☰]` sidebar toggle.
  - Test demo project simulation with Verilator (verify waveforms appear).
  - Test Yosys synthesis tab (verify logic gate cards and netlist display).

- [ ] **Step 4: Commit & Push to GitHub**
  ```bash
  git add -A
  git commit -m "chore(release): package and release verisim ide with activity bar and yosys synthesis"
  git push origin refs/heads/master:refs/heads/master
  ```
