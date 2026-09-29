# Specification: Tauri 2.12 Upgrade, GitHub Toolchain Ingestion, AppImage Bundling, and VSCodium UI/UX Overhaul

## 1. Executive Summary
This specification outlines the architecture and implementation for:
1. Upgrading the desktop runtime to **Tauri 2.12.0** (Rust core and frontend `@tauri-apps/*` packages).
2. Implementing an automated GitHub release ingestion pipeline for portable, self-contained open-source EDA executables (**YosysHQ OSS CAD Suite**).
3. Bundling the entire application and zero-dependency toolchain into a self-contained **Linux AppImage**.
4. Overhauling the user interface and user experience into an authentic, highly optimized **VSCodium / VS Code Dark Modern** workstation shell.

---

## 2. Toolchain Sourcing & GitHub Release Ingestion

### 2.1 Toolchain Source
* **Upstream Repository**: `https://github.com/YosysHQ/oss-cad-suite-build/releases`
* **Target Architecture**: Linux x86_64
* **Distribution Target Directory**: `src-tauri/toolchain/`

### 2.2 Bundled Components
* **Binaries (`bin/`)**:
  * `yosys`: RTL logic synthesis and formal verification engine
  * `abc` / `yosys-abc`: Combinational logic synthesis and mapping
  * `iverilog`: Icarus Verilog compiler (IEEE 1364-2001 and IEEE 1800-2012 subset)
  * `vvp`: Icarus Verilog simulation runtime
  * `verilator`, `verilator_bin`: Fast SystemVerilog linting and cycle-accurate compilation
  * `gtkwave`: Portable waveform viewing utility
* **Shared Libraries (`lib/`)**:
  * Portable runtime libraries (`libffi`, `libreadline`, `libtcl`, bundled Python runtime libraries, and `lib/ivl`) preventing host glibc or host Python version mismatches.
* **Shared Data (`share/`)**:
  * `share/yosys/`: Techmap architectures (Xilinx, Lattice, QuickLogic, generic simcells)
  * `share/verilator/`: Verilator runtime include headers and templates

### 2.3 Automated Staging Script (`scripts/fetch-oss-cad-suite.sh`)
* **Behavior**:
  * Inspects existing `src-tauri/toolchain/bin/` to avoid unnecessary 500MB+ downloads if functional executables are already present, unless executed with `--force`.
  * Downloads the pinned stable release tarball from GitHub releases via `curl` / `wget`.
  * Extracts the selected binaries, libraries, and share files into `src-tauri/toolchain/`.
  * Sets executable permissions (`chmod +x`) on all binaries.
  * Validates the toolchain by running each binary with version flags (`--version` / `-V`).

### 2.4 Backend Runtime Resolution (`src-tauri/src/lib.rs`)
* Dynamic path discovery in order of priority:
  1. Tauri resource directory: `handle.path().resource_dir().join("toolchain")`
  2. Linux AppImage environment: `$APPDIR/usr/lib/verisim-ide/toolchain` and `$APPDIR/toolchain`
  3. Binary relative path: `current_exe().parent().join("toolchain")`
  4. Local development workspace: `current_dir().join("src-tauri/toolchain")`
* Environment injection for child processes:
  * `PATH`: `$TOOLCHAIN/bin:$PATH`
  * `LD_LIBRARY_PATH`: `$TOOLCHAIN/lib:$TOOLCHAIN/lib/ivl:$LD_LIBRARY_PATH`
  * `YOSYS_DATDIR`: `$TOOLCHAIN/share/yosys`
  * `VERILATOR_ROOT`: `$TOOLCHAIN/share/verilator`

---

## 3. Tauri 2.12 Framework & Packaging Configuration

### 3.1 Dependency Matrix
* **Frontend Packages (`package.json`)**:
  * `@tauri-apps/api`: `^2.12.0`
  * `@tauri-apps/cli`: `^2.12.0`
  * `@tauri-apps/plugin-dialog`: `^2.8.0`
  * `@tauri-apps/plugin-fs`: `^2.6.0`
  * `@tauri-apps/plugin-log`: `^2.10.0`
  * `@tauri-apps/plugin-os`: `^2.4.0`
  * `@tauri-apps/plugin-process`: `^2.4.0`
  * `@tauri-apps/plugin-shell`: `^2.4.0`
* **Backend Crates (`src-tauri/Cargo.toml`)**:
  * `tauri = "2.12.0"`
  * `tauri-build = "2.7.0"`
  * `tauri-plugin-* = "2"`
  * `edition = "2021"`, `rust-version = "1.77.2"`

### 3.2 Configuration (`src-tauri/tauri.conf.json`)
* **Bundle Targets**:
  ```json
  "targets": [
    "appimage",
    "deb",
    "rpm"
  ]
  ```
* **Resource Ingestion**:
  ```json
  "resources": {
    "toolchain/": "toolchain"
  }
  ```
* **AppImage Packaging Script**:
  * `npm run build:appimage`: runs `NO_STRIP=true tauri build --bundles appimage` to ensure binaries and dynamic libraries in the bundle remain intact.

---

## 4. VSCodium / VS Code Style UI/UX Overhaul

### 4.1 Theme & Styling Foundations
* **Color Palette (VSCodium Dark Modern)**:
  * Header/Titlebar: `#1f1f1f`
  * Activity Bar: `#181818`
  * Sidebars & Panels: `#181818`
  * Code Editor canvas: `#1e1e1e`
  * Status Bar: `#0078d4` (accent blue in active session)
  * Hairline borders: 1px `#2b2b2b` / `rgba(255, 255, 255, 0.08)`
  * Accent highlights: `#0078d4`, `#0e639c`, `#3794ff`
* **Typography**: Clean sans-serif system UI font with monospace fonts for code and output (`JetBrains Mono`, `Consolas`, `monospace`).

### 4.2 Application Menubar & Titlebar (`VSCodiumTitlebar.tsx`)
* **Integrated Menus**:
  * **File**: New File, New Project, Open File, Open Project, Save, Save As, Close File
  * **Edit**: Undo, Redo, Cut, Copy, Paste, Find, Replace
  * **Selection**: Select All, Duplicate Line, Expand Selection
  * **View**: Explorer, RTL Synthesis, Waveforms, AI Studio, Toggle Sidebar, Toggle Bottom Panel
  * **Run**: Run Simulation (`Ctrl+Enter`), Synthesize RTL, Run Python Testbench, EDA Toolchain Settings
  * **Terminal**: Toggle Integrated Dock, Clear Console
  * **Help**: Keyboard Shortcuts, Documentation, Diagnostics, About Verisim
* **Command Palette / Quick Open**:
  * Centered search box displaying `verisim-ide — [project name] — [active file]` with shortcut hint (`Ctrl+P`).
  * Clicking opens an interactive Command Palette modal to quickly switch between project files or run IDE actions.
* **Workstation Quick Actions**:
  * Primary Green Play button (`▶ Run Simulation`)
  * Layout switchers (Toggle Sidebar, Toggle Dock, Split Waveform/Editor)
  * Theme Toggle (Dark Modern / Light)

### 4.3 Activity Bar & Primary Sidebar
* **Activity Bar (48px left rail)**:
  * Top icons:
    * `Explorer` (`Files`)
    * `RTL Gate Synthesis` (`Zap`)
    * `Waveform Traces` (`Activity`)
    * `HDL Assistant Studio` (`Sparkles`)
  * Active state: solid 2px left indicator accent bar with full opacity icon.
  * Bottom icons:
    * EDA Toolchain Settings (`Settings` gear) with real-time health indicator badge.
* **Primary Sidebar Sections**:
  * Collapsible VSCodium accordion containers:
    * `OPEN EDITORS`: Shows list of open tab files with dirty indicator dot and close button.
    * `WORKSPACE EXPLORER`: Hierarchical tree with project files and action icons (New File, New Folder, Refresh, Collapse All).
    * `OUTLINE`: Modules, inputs, outputs, registers, and testbenches discovered in the active HDL file.

### 4.4 Editor Tabs, Breadcrumbs & Bottom Panel Dock
* **Tab Bar**:
  * Clean tabs with file icons, modified dirty dot, close button on hover, and active tab highlight.
  * Breadcrumb bar underneath: `workspace > src > counter.v > counter_tb`.
* **Integrated Bottom Panel Dock**:
  * VS Code panel tabs: `PROBLEMS`, `SIMULATION OUTPUT`, `RTL SYNTHESIS`, `PYTHON TERMINAL`, `WAVEFORM TRACES`.
  * Panel header controls: Clear Output, Word Wrap toggle, Maximize/Restore panel, Close panel (`×`).
* **Sleek VSCodium Status Bar**:
  * Left: `EDA: Verisim v6.1.0` | `0 ⨂ 0 ⚠` | `HDL: Icarus/Verilator` | `Yosys: Ready` | `Python: Ready`
  * Right: `Ln X, Col Y` | `Spaces: 2` | `UTF-8` | `LF` | `SystemVerilog` | `⚡ AI Assist`

---

## 5. Verification & Acceptance Criteria
1. **Compilation**: `npm run build` and `cargo test` pass with 0 errors on Tauri 2.12.0.
2. **Toolchain Health**: Backend correctly discovers bundled `yosys`, `iverilog`, `vvp`, `verilator`, and `python3`, reporting all healthy.
3. **Simulation & Synthesis**: Running simulation and synthesis runs successfully using the bundled executables.
4. **AppImage Target**: `npm run build:appimage` (or `tauri build --bundles appimage`) packages into an AppImage binary.
5. **UI/UX Consistency**: VSCodium layout renders seamlessly with menu bar, command palette, activity bar, collapsible file explorer, editor tabs, bottom dock, and status bar.
