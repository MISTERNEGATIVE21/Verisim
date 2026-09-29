# Tauri 2.12, GitHub Toolchain Ingestion, AppImage Bundling & VSCodium UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Verisim to Tauri 2.12+, ingest portable prebuilt EDA executables from GitHub releases (YosysHQ OSS CAD Suite), package into a standalone Linux AppImage, and overhaul the workstation UI/UX into an authentic VSCodium Dark Modern style.

**Architecture:** Automated shell ingestion stages portable, self-contained EDA tools (Yosys, ABC, Icarus Verilog, VVP, Verilator, GTKWave) with their own dynamic libraries into `src-tauri/toolchain`. Tauri 2.12 handles backend tool dispatch and AppImage bundling with zero host dependencies. The frontend layout is restructured around a standard VSCodium shell (Integrated Menubar/Titlebar with Command Palette, 48px Activity Bar, Accordion Sidebar with Open Editors and Outline, breadcrumbs, unified Dock panel, and VSCodium Status Bar).

**Tech Stack:** Tauri 2.12, Rust 1.77+, Next.js 16 (Turbopack), React 19, Tailwind CSS v4, Lucide React, Radix UI, Monaco Editor.

**Spec:** [`docs/superpowers/specs/2026-09-29-tauri2-github-toolchain-appimage-vscodium-design.md`](file:///home/mister/Documents/GitHub/Verisim/docs/superpowers/specs/2026-09-29-tauri2-github-toolchain-appimage-vscodium-design.md)

## Global Constraints

- Tauri core and CLI version floor: `2.12.0`
- Tauri plugins version: `~2` / `^2.4.0+`
- Toolchain upstream source: `https://github.com/YosysHQ/oss-cad-suite-build/releases`
- Embedded toolchain directory: `src-tauri/toolchain`
- AppImage bundle target: `"appimage"` in `src-tauri/tauri.conf.json`
- Preserve executables and shared objects without stripping: `NO_STRIP=true`
- VSCodium color palette: `#1f1f1f` (Titlebar), `#181818` (Activity Bar/Sidebar/Dock), `#1e1e1e` (Editor), `#0078d4` (Status Bar/Accents)

## Review Focus

1. Toolchain path resolution in AppImage: `$APPDIR/usr/lib/verisim-ide/toolchain` and `$APPDIR/toolchain` must be discovered correctly at runtime.
2. Dynamic library isolation: `LD_LIBRARY_PATH` must prioritize bundled `lib/` and `lib/ivl/` so host libc/python differences never cause runtime segfaults.
3. Command Palette and Titlebar responsiveness: Must handle keyboard shortcuts (`Ctrl+P`, `Ctrl+Shift+P`, `Ctrl+S`, `Ctrl+Enter`) seamlessly.
4. Non-project state: When no project is loaded, the VSCodium titlebar and status bar remain functional and styled consistently.
5. AppImage generation: `npm run build:appimage` must generate a runnable `.AppImage` artifact in `src-tauri/target/release/bundle/appimage/`.

---

### Task 1: GitHub Toolchain Ingestion Script (`scripts/fetch-oss-cad-suite.sh`)

**Files:**
- Create: `scripts/fetch-oss-cad-suite.sh`
- Modify: `package.json`

**Interfaces:**
- Produces: Complete, verified toolchain at `src-tauri/toolchain/{bin,lib,share}` with executable permissions.

- [ ] **Step 1: Write `scripts/fetch-oss-cad-suite.sh`**
  Implement script to check existing binaries, download `oss-cad-suite-linux-x64` from GitHub releases when missing or with `--force`, extract `bin/` (`yosys`, `abc`, `iverilog`, `vvp`, `verilator`, `verilator_bin`, `gtkwave`), `lib/`, and `share/`, and test execution with `-V` or `--version`.

- [ ] **Step 2: Add `fetch:toolchain` script to `package.json`**
  Add `"fetch:toolchain": "bash scripts/fetch-oss-cad-suite.sh"` to `scripts` in `package.json`.

- [ ] **Step 3: Run the script and verify toolchain integrity**
  Run: `bash scripts/fetch-oss-cad-suite.sh`
  Expected: All binaries (`yosys`, `iverilog`, `vvp`, `verilator`) report valid version output.

- [ ] **Step 4: Commit**
  ```bash
  git add scripts/fetch-oss-cad-suite.sh package.json
  git commit -m "feat(toolchain): add automated GitHub release ingestion script for OSS CAD Suite"
  ```

---

### Task 2: Tauri 2.12 Dependency Upgrades & AppImage Configuration

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Consumes: Tauri 2.12 crates and npm packages.
- Produces: Updated configurations ready for compilation and AppImage bundling.

- [ ] **Step 1: Update `package.json` dependencies**
  Update `@tauri-apps/api` and `@tauri-apps/cli` to `^2.12.0`, and all `@tauri-apps/plugin-*` to latest v2 versions.

- [ ] **Step 2: Update `src-tauri/Cargo.toml` dependencies**
  Update `tauri = "2.12.0"` and `tauri-build = "2.7.0"`.

- [ ] **Step 3: Update `src-tauri/tauri.conf.json`**
  Ensure `"targets": ["appimage", "deb", "rpm"]` in `bundle` and preserve `"resources": { "toolchain/": "toolchain" }`.

- [ ] **Step 4: Run `cargo check` in `src-tauri` to verify dependency resolution**
  Run: `cd src-tauri && cargo check`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
  git commit -m "chore(tauri): upgrade to Tauri 2.12 and configure AppImage bundle target"
  ```

---

### Task 3: Backend Runtime Adaptation for AppImage Toolchain Resolution

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: Toolchain paths from `APPDIR`, `resource_dir`, or `src-tauri/toolchain`.
- Produces: `check_toolchain`, `simulate`, and `synthesize` IPC commands configured with proper environment variables.

- [ ] **Step 1: Verify and expand `find_bundled_toolchain_dir` in `src-tauri/src/lib.rs`**
  Ensure `APPDIR` lookup handles standard AppImage paths (`$APPDIR/usr/lib/verisim-ide/toolchain`, `$APPDIR/toolchain`, `$APPDIR/usr/lib/toolchain`) and GTKWave resolution.

- [ ] **Step 2: Add unit test for AppImage path resolution and GTKWave detection**
  Add unit test in `src-tauri/src/lib.rs` verifying that toolchain resolution handles custom and bundled binaries properly.

- [ ] **Step 3: Run `cargo test` to verify backend tests pass**
  Run: `cd src-tauri && cargo test`
  Expected: All unit tests pass.

- [ ] **Step 4: Commit**
  ```bash
  git add src-tauri/src/lib.rs
  git commit -m "feat(backend): refine toolchain resolution for AppImage runtime and GTKWave"
  ```

---

### Task 4: VSCodium Titlebar, Menubar & Command Palette

**Files:**
- Create: `src/components/ide/VSCodiumTitlebar.tsx`
- Create: `src/components/ide/CommandPalette.tsx`
- Modify: `src/components/ide/IDELayout.tsx`

**Interfaces:**
- Produces: Top-level VSCodium Titlebar with menus (File, Edit, Selection, View, Run, Terminal, Help), centered Quick Open / Command Palette (`Ctrl+P`), and layout toggles.

- [ ] **Step 1: Create `src/components/ide/CommandPalette.tsx`**
  Implement searchable modal (`cmdk`) supporting Quick Open (jump to project file) and Commands (Run Simulation, Synthesize, New File, Open Toolchain Settings, Toggle Theme).

- [ ] **Step 2: Create `src/components/ide/VSCodiumTitlebar.tsx`**
  Implement standard VS Code menubar dropdowns with shortcuts, centered Command Palette launcher bar, quick-run button (`▶ Run`), layout switchers, and theme toggle.

- [ ] **Step 3: Wire `VSCodiumTitlebar` into `src/components/ide/IDELayout.tsx`**
  Replace standard toolbar with `VSCodiumTitlebar`, including global keyboard listener for `Ctrl+P` and `Ctrl+Shift+P`.

- [ ] **Step 4: Verify frontend build**
  Run: `npm run build`
  Expected: Turbopack compile succeeds.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/ide/VSCodiumTitlebar.tsx src/components/ide/CommandPalette.tsx src/components/ide/IDELayout.tsx
  git commit -m "feat(ui): add VSCodium titlebar, dropdown menus, and command palette"
  ```

---

### Task 5: VSCodium Activity Bar, Sidebar Accordions & Explorer

**Files:**
- Modify: `src/components/ide/ActivityBar.tsx`
- Modify: `src/components/ide/FileExplorer.tsx`

**Interfaces:**
- Produces: 48px VSCodium Activity Bar with left indicator bar, and primary sidebar with collapsible sections (`OPEN EDITORS`, `WORKSPACE`, `OUTLINE`).

- [ ] **Step 1: Refactor `src/components/ide/ActivityBar.tsx`**
  Apply 48px width, `#181818` background, 2px solid active indicator accent on left, subtle icon hover styling, and bottom EDA toolchain gear icon with status badge.

- [ ] **Step 2: Enhance `src/components/ide/FileExplorer.tsx` with VSCodium Accordions**
  Implement collapsible sections:
  1. `OPEN EDITORS` (active tabs with dirty dot and close button)
  2. `VERISIM WORKSPACE` (project file tree with file actions)
  3. `OUTLINE` (module and port hierarchy of active HDL file).

- [ ] **Step 3: Verify frontend build**
  Run: `npm run build`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/ide/ActivityBar.tsx src/components/ide/FileExplorer.tsx
  git commit -m "feat(ui): overhaul Activity Bar and File Explorer with VSCodium accordions"
  ```

---

### Task 6: VSCodium Editor Tabs, Breadcrumbs, Integrated Dock & Status Bar

**Files:**
- Modify: `src/components/ide/CodeEditor.tsx`
- Modify: `src/components/ide/IntegratedDock.tsx`
- Modify: `src/components/ide/StatusBar.tsx`

**Interfaces:**
- Produces: VSCodium breadcrumb bar, clean editor tabs, bottom dock panel tabs with controls, and authentic VSCodium blue status bar.

- [ ] **Step 1: Update `src/components/ide/CodeEditor.tsx`**
  Add breadcrumb trail (`workspace > src > file.v > module`), refine tabs with close on hover, dirty dot, and split editor button.

- [ ] **Step 2: Update `src/components/ide/IntegratedDock.tsx`**
  Style bottom panel headers to match VS Code (`PROBLEMS`, `OUTPUT`, `SYNTHESIS`, `TERMINAL`, `WAVEFORM`), with clear, word wrap, maximize, and close controls.

- [ ] **Step 3: Overhaul `src/components/ide/StatusBar.tsx`**
  Style status bar with `#0078d4` (or VSCodium Dark Modern), displaying project/branch name, error/warning counters, toolchain status, cursor position (`Ln X, Col Y`), spaces, encoding (`UTF-8`), and HDL language mode.

- [ ] **Step 4: Verify frontend build**
  Run: `npm run build`
  Expected: Clean build.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/ide/CodeEditor.tsx src/components/ide/IntegratedDock.tsx src/components/ide/StatusBar.tsx
  git commit -m "feat(ui): update editor tabs, breadcrumbs, integrated dock, and status bar to VSCodium design"
  ```

---

### Task 7: Full Compilation, Packaging AppImage & Verification

**Files:**
- Output: `src-tauri/target/release/bundle/appimage/verisim-ide_*.AppImage`

**Interfaces:**
- Produces: Functional Linux AppImage bundling the complete application and self-contained toolchain.

- [ ] **Step 1: Run comprehensive backend test suite**
  Run: `cargo test` in `src-tauri`
  Expected: All 8+ tests pass.

- [ ] **Step 2: Run production Next.js build**
  Run: `npm run build`
  Expected: Build succeeds and outputs static pages into `out/`.

- [ ] **Step 3: Run AppImage build**
  Run: `npm run build:appimage`
  Expected: AppImage is created in `src-tauri/target/release/bundle/appimage/`.

- [ ] **Step 4: Verify AppImage binary execution**
  Run: `./src-tauri/target/release/bundle/appimage/verisim-ide_*.AppImage --help` or `--version`
  Expected: AppImage executes cleanly.

- [ ] **Step 5: Commit all remaining changes**
  ```bash
  git add -A
  git commit -m "release: finalize Tauri 2.12 upgrade, AppImage packaging, and VSCodium UI/UX"
  ```
