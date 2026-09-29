use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VerilogFile {
    pub id: String,
    pub name: String,
    pub content: String,
    #[serde(rename = "type")]
    pub file_type: String,
    pub project_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub files: Vec<VerilogFile>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimulationResult {
    pub success: bool,
    pub output: String,
    #[serde(rename = "vcdContent")]
    pub vcd_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PythonResult {
    pub success: bool,
    pub output: String,
    pub exit_code: i32,
}

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, PartialEq)]
pub struct ToolchainConfig {
    #[serde(default)]
    pub use_custom_paths: bool,
    pub iverilog_path: Option<String>,
    pub vvp_path: Option<String>,
    pub verilator_path: Option<String>,
    pub yosys_path: Option<String>,
    pub python_path: Option<String>,
    #[serde(default)]
    pub gtkwave_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct ToolStatus {
    pub name: String,
    pub found: bool,
    pub resolved_path: String,
    pub version: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct ToolchainHealth {
    pub iverilog: ToolStatus,
    pub vvp: ToolStatus,
    pub verilator: ToolStatus,
    pub yosys: ToolStatus,
    pub python: ToolStatus,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gtkwave: Option<ToolStatus>,
}

/// Searches candidate directories within an AppImage bundle environment ($APPDIR)
pub fn find_appdir_toolchain(appdir: &Path) -> Option<PathBuf> {
    let candidates = [
        appdir.join("usr/lib/verisim-ide/toolchain"),
        appdir.join("usr/lib/toolchain"),
        appdir.join("toolchain"),
    ];
    for c in &candidates {
        if c.join("bin").exists() {
            return Some(c.clone());
        }
    }
    None
}

/// Searches candidate directories relative to the current executable's parent directory
pub fn find_exe_parent_toolchain(parent: &Path) -> Option<PathBuf> {
    let candidates = [
        parent.join("toolchain"),
        parent.join("../lib/verisim-ide/toolchain"),
        parent.join("../../usr/lib/verisim-ide/toolchain"),
    ];
    for c in &candidates {
        if c.join("bin").exists() {
            return Some(c.clone());
        }
    }
    None
}

/// Searches candidate directories relative to the current working directory / workspace
pub fn find_cwd_toolchain(cwd: &Path) -> Option<PathBuf> {
    let candidates = [
        cwd.join("src-tauri/toolchain"),
        cwd.join("toolchain"),
        cwd.join("../src-tauri/toolchain"),
    ];
    for c in &candidates {
        if c.join("bin").exists() {
            return Some(c.clone());
        }
    }
    None
}

pub fn find_bundled_toolchain_dir(app_handle: Option<&tauri::AppHandle>) -> Option<PathBuf> {
    // 1. Check via app_handle resource_dir if available (Tauri v2 standard)
    if let Some(handle) = app_handle {
        if let Ok(res_dir) = handle.path().resource_dir() {
            let candidates = [
                res_dir.join("toolchain"),
                res_dir.join("usr/lib/verisim-ide/toolchain"),
            ];
            for c in &candidates {
                if c.join("bin").exists() {
                    return Some(c.clone());
                }
            }
        }
    }

    // 2. Check APPDIR (AppImage environment)
    if let Ok(appdir) = std::env::var("APPDIR") {
        let trimmed = appdir.trim();
        if !trimmed.is_empty() {
            if let Some(dir) = find_appdir_toolchain(Path::new(trimmed)) {
                return Some(dir);
            }
        }
    }

    // 3. Check relative to current_exe
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if let Some(dir) = find_exe_parent_toolchain(parent) {
                return Some(dir);
            }
        }
    }

    // 4. Check relative to current_dir / workspace
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(dir) = find_cwd_toolchain(&cwd) {
            return Some(dir);
        }
    }

    None
}

pub fn configure_tool_cmd(
    cmd: &mut Command,
    bundled_dir: Option<&Path>,
) {
    if let Some(tc_dir) = bundled_dir {
        let bin_dir = tc_dir.join("bin");
        let lib_dir = tc_dir.join("lib");
        let share_yosys = tc_dir.join("share/yosys");
        let share_verilator = tc_dir.join("share/verilator");

        let current_path = std::env::var("PATH").unwrap_or_default();
        let new_path = format!("{}:{}", bin_dir.display(), current_path);
        cmd.env("PATH", new_path);

        let current_ld = std::env::var("LD_LIBRARY_PATH").unwrap_or_default();
        let new_ld = if current_ld.is_empty() {
            format!("{}", lib_dir.display())
        } else {
            format!("{}:{}", lib_dir.display(), current_ld)
        };
        cmd.env("LD_LIBRARY_PATH", new_ld);

        cmd.env("YOSYS_DATDIR", share_yosys);
        cmd.env("VERILATOR_ROOT", share_verilator);
    }
}

pub fn resolve_tool_binary(
    _name: &str,
    default_bin: &str,
    custom_path: Option<&str>,
    bundled_dir: Option<&Path>,
) -> String {
    if let Some(p) = custom_path {
        let trimmed = p.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    if let Some(tc_dir) = bundled_dir {
        let candidate = tc_dir.join("bin").join(default_bin);
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
    }

    default_bin.to_string()
}

pub fn resolve_tool(
    name: &str,
    default_bin: &str,
    custom_path: Option<&str>,
    version_arg: &str,
    bundled_dir: Option<&Path>,
) -> ToolStatus {
    let candidate = resolve_tool_binary(name, default_bin, custom_path, bundled_dir);
    let mut cmd = Command::new(&candidate);
    cmd.arg(version_arg);

    if default_bin == "iverilog" {
        if let Some(tc_dir) = bundled_dir {
            let ivl_lib = tc_dir.join("lib/ivl");
            if ivl_lib.exists() {
                cmd.arg("-B").arg(&ivl_lib);
            }
        }
    }

    configure_tool_cmd(&mut cmd, bundled_dir);

    let res = cmd.output();
    match res {
        Ok(output) => {
            let out_str = String::from_utf8_lossy(&output.stdout).to_string();
            let err_str = String::from_utf8_lossy(&output.stderr).to_string();
            let combined = format!("{}\n{}", out_str, err_str);

            let first_meaningful_line = combined
                .lines()
                .map(|l| l.trim())
                .find(|l| !l.is_empty() && !l.starts_with("Unable to get version"))
                .unwrap_or("Available")
                .to_string();

            let is_bundled = bundled_dir.map_or(false, |d| candidate.starts_with(d.to_string_lossy().as_ref()));
            let display_path = if is_bundled {
                format!("(Bundled) {}", candidate)
            } else if candidate.contains('/') {
                candidate.clone()
            } else {
                Command::new("which")
                    .arg(&candidate)
                    .output()
                    .ok()
                    .and_then(|w| {
                        let path = String::from_utf8_lossy(&w.stdout).trim().to_string();
                        if !path.is_empty() {
                            Some(path)
                        } else {
                            None
                        }
                    })
                    .unwrap_or(candidate)
            };

            ToolStatus {
                name: name.to_string(),
                found: true,
                resolved_path: display_path,
                version: first_meaningful_line,
                error: None,
            }
        }
        Err(e) => ToolStatus {
            name: name.to_string(),
            found: false,
            resolved_path: String::new(),
            version: String::new(),
            error: Some(format!("{}", e)),
        },
    }
}

pub fn resolve_gtkwave_binary(
    custom_path: Option<&str>,
    bundled_dir: Option<&Path>,
) -> String {
    resolve_tool_binary("GTKWave", "gtkwave", custom_path, bundled_dir)
}

pub fn resolve_gtkwave(
    custom_path: Option<&str>,
    bundled_dir: Option<&Path>,
) -> ToolStatus {
    resolve_tool("GTKWave", "gtkwave", custom_path, "--version", bundled_dir)
}

pub fn check_toolchain_internal(
    bundled_dir: Option<&Path>,
    config: Option<ToolchainConfig>,
) -> Result<ToolchainHealth, String> {
    let cfg = config.unwrap_or_default();
    let use_custom = cfg.use_custom_paths;

    let iverilog = resolve_tool(
        "Icarus Verilog",
        "iverilog",
        if use_custom { cfg.iverilog_path.as_deref() } else { None },
        "-V",
        bundled_dir,
    );
    let vvp = resolve_tool(
        "VVP Runtime",
        "vvp",
        if use_custom { cfg.vvp_path.as_deref() } else { None },
        "-V",
        bundled_dir,
    );
    let verilator = resolve_tool(
        "Verilator",
        "verilator",
        if use_custom { cfg.verilator_path.as_deref() } else { None },
        "--version",
        bundled_dir,
    );
    let yosys = resolve_tool(
        "Yosys Synthesis",
        "yosys",
        if use_custom { cfg.yosys_path.as_deref() } else { None },
        "-V",
        bundled_dir,
    );
    let python = resolve_tool(
        "Python 3",
        "python3",
        if use_custom { cfg.python_path.as_deref() } else { None },
        "--version",
        bundled_dir,
    );
    let gtkwave = resolve_gtkwave(
        if use_custom { cfg.gtkwave_path.as_deref() } else { None },
        bundled_dir,
    );

    Ok(ToolchainHealth {
        iverilog,
        vvp,
        verilator,
        yosys,
        python,
        gtkwave: Some(gtkwave),
    })
}

#[tauri::command]
fn check_toolchain(app: tauri::AppHandle, config: Option<ToolchainConfig>) -> Result<ToolchainHealth, String> {
    let bundled_dir = find_bundled_toolchain_dir(Some(&app));
    check_toolchain_internal(bundled_dir.as_deref(), config)
}

#[tauri::command]
async fn open_in_gtkwave(
    app: tauri::AppHandle,
    vcd_path: String,
    toolchain: Option<ToolchainConfig>,
) -> Result<String, String> {
    let tc = toolchain.unwrap_or_default();
    let bundled_dir = find_bundled_toolchain_dir(Some(&app));
    let gtkwave_bin = resolve_gtkwave_binary(
        if tc.use_custom_paths { tc.gtkwave_path.as_deref() } else { None },
        bundled_dir.as_deref(),
    );

    let mut cmd = Command::new(&gtkwave_bin);
    cmd.arg(&vcd_path);
    configure_tool_cmd(&mut cmd, bundled_dir.as_deref());

    match cmd.spawn() {
        Ok(_) => Ok(format!("Opened {} in GTKWave ({})", vcd_path, gtkwave_bin)),
        Err(e) => Err(format!("Failed to launch GTKWave at '{}': {}", gtkwave_bin, e)),
    }
}

pub fn detect_modules(content: &str) -> Vec<String> {
    let mut modules = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("module") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 2 {
                let name_part = parts[1];
                let mod_name = name_part
                    .trim_matches(|c: char| !c.is_alphanumeric() && c != '_');
                if !mod_name.is_empty() {
                    modules.push(mod_name.to_string());
                }
            }
        }
    }
    modules
}

pub fn detect_testbench_module(files: &[VerilogFile]) -> Option<String> {
    // 1. First priority: look for a file containing $dumpfile and extract its module
    for file in files {
        if file.content.contains("$dumpfile") {
            let mods = detect_modules(&file.content);
            if let Some(m) = mods.first() {
                return Some(m.clone());
            }
        }
    }

    // 2. Second priority: look for files or modules containing _tb suffix
    for file in files {
        let mods = detect_modules(&file.content);
        for m in mods {
            if file.name.contains("_tb") || m.ends_with("_tb") {
                return Some(m);
            }
        }
    }

    None
}

pub fn parse_yosys_stat(output: &str) -> (HashMap<String, usize>, usize, usize, usize) {
    let mut cell_counts = HashMap::new();
    let mut wire_count = 0;
    let mut bit_count = 0;
    let mut public_wires = 0;
    let mut in_cells = false;

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Number of wires:") {
            if let Some(val_str) = trimmed.split(':').nth(1) {
                wire_count = val_str.trim().parse::<usize>().unwrap_or(0);
            }
        } else if trimmed.starts_with("Number of wire bits:") {
            if let Some(val_str) = trimmed.split(':').nth(1) {
                bit_count = val_str.trim().parse::<usize>().unwrap_or(0);
            }
        } else if trimmed.starts_with("Number of public wires:") {
            if let Some(val_str) = trimmed.split(':').nth(1) {
                public_wires = val_str.trim().parse::<usize>().unwrap_or(0);
            }
        } else if trimmed.starts_with("Number of cells:") {
            in_cells = true;
        } else if in_cells {
            if trimmed.is_empty() || trimmed.starts_with("===") {
                in_cells = false;
            } else {
                let tokens: Vec<&str> = trimmed.split_whitespace().collect();
                if tokens.len() >= 2 {
                    let cell_name = tokens[0].to_string();
                    if let Ok(count) = tokens[1].parse::<usize>() {
                        cell_counts.insert(cell_name, count);
                    }
                }
            }
        }
    }

    (cell_counts, wire_count, bit_count, public_wires)
}

pub fn project_from_verilog_file(path: &str, content: &str) -> Project {
    let p = std::path::Path::new(path);
    let file_name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("module.v")
        .to_string();

    let is_sv = file_name.ends_with(".sv") || file_name.ends_with(".svh");
    let is_tb = file_name.contains("_tb") || content.contains("$dumpfile");
    let file_type = if is_tb {
        "testbench"
    } else if is_sv {
        "systemverilog"
    } else {
        "verilog"
    };

    let proj_name = p
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Project")
        .to_string();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string();

    Project {
        id: format!("proj_{}", now),
        name: proj_name,
        description: Some(format!("Loaded from {}", file_name)),
        files: vec![VerilogFile {
            id: format!("file_{}", now),
            name: file_name,
            content: content.to_string(),
            file_type: file_type.to_string(),
            project_id: format!("proj_{}", now),
        }],
        created_at: now.clone(),
        updated_at: now,
    }
}

pub fn verilog_file_from_path(path: &str, content: &str, idx: usize) -> VerilogFile {
    let p = std::path::Path::new(path);
    let name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file.v")
        .to_string();

    let is_sv = name.ends_with(".sv") || name.ends_with(".svh");
    let is_tb = name.contains("_tb") || content.contains("$dumpfile");
    let is_py = name.ends_with(".py");
    let is_mem = name.ends_with(".hex") || name.ends_with(".mem");

    let file_type = if is_tb {
        "testbench"
    } else if is_py {
        "python"
    } else if is_mem {
        "memory"
    } else if is_sv {
        "systemverilog"
    } else {
        "verilog"
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    VerilogFile {
        id: format!("file_{}_{}", now, idx),
        name,
        content: content.to_string(),
        file_type: file_type.to_string(),
        project_id: "current".to_string(),
    }
}

#[tauri::command]
fn open_project(path: String) -> Result<Project, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    if path.ends_with(".vsm") {
        let project: Project = serde_json::from_str(&content).map_err(|e| format!("Failed to parse project file: {}", e))?;
        Ok(project)
    } else {
        // Automatically wrap .v, .sv, or other HDL file into a ready-to-simulate project
        Ok(project_from_verilog_file(&path, &content))
    }
}

#[tauri::command]
fn read_external_files(paths: Vec<String>) -> Result<Vec<VerilogFile>, String> {
    let mut files = Vec::new();
    for (idx, path) in paths.iter().enumerate() {
        let content = fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {}", path, e))?;
        files.push(verilog_file_from_path(path, &content, idx));
    }
    Ok(files)
}

#[tauri::command]
fn save_project(path: String, project: Project) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&project).map_err(|e| format!("Failed to serialize project: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write save file: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn simulate(
    app: tauri::AppHandle,
    engine: Option<String>,
    files: Vec<VerilogFile>,
    toolchain: Option<ToolchainConfig>,
) -> Result<SimulationResult, String> {
    let chosen_engine = engine.unwrap_or_else(|| "iverilog".to_string());
    let tc = toolchain.unwrap_or_default();
    let bundled_dir = find_bundled_toolchain_dir(Some(&app));

    let verilator_bin = resolve_tool_binary(
        "Verilator",
        "verilator",
        if tc.use_custom_paths { tc.verilator_path.as_deref() } else { None },
        bundled_dir.as_deref(),
    );
    let iverilog_bin = resolve_tool_binary(
        "Icarus Verilog",
        "iverilog",
        if tc.use_custom_paths { tc.iverilog_path.as_deref() } else { None },
        bundled_dir.as_deref(),
    );
    let vvp_bin = resolve_tool_binary(
        "VVP Runtime",
        "vvp",
        if tc.use_custom_paths { tc.vvp_path.as_deref() } else { None },
        bundled_dir.as_deref(),
    );

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
        // Detect if there is a testbench module or $dumpfile in any file
        let testbench_module = detect_testbench_module(&files);

        // If testbench found: compile with verilator --binary --trace
        if let Some(top_tb) = testbench_module {
            let mut verilator_cmd = Command::new(&verilator_bin);
            verilator_cmd
                .arg("--binary")
                .arg("--trace")
                .arg("--trace-structs")
                .arg("-Wall")
                .arg("-Wno-fatal")
                .arg("-Wno-WIDTHEXPAND")
                .arg("-Wno-WIDTHTRUNC")
                .arg("-Wno-DECLFILENAME")
                .arg("-Wno-UNDRIVEN")
                .arg("-Wno-UNUSEDSIGNAL")
                .arg("--top-module")
                .arg(&top_tb)
                .arg("-Mdir")
                .arg(temp_dir.join("obj_dir"));

            for file in &files {
                if file.name.ends_with(".v") || file.name.ends_with(".sv") {
                    verilator_cmd.arg(temp_dir.join(&file.name));
                }
            }

            verilator_cmd.current_dir(&temp_dir);
            configure_tool_cmd(&mut verilator_cmd, bundled_dir.as_deref());

            let compile_res = verilator_cmd.output().map_err(|e| format!("Failed to run verilator: {}", e))?;
            let stdout_comp = String::from_utf8_lossy(&compile_res.stdout).to_string();
            let stderr_comp = String::from_utf8_lossy(&compile_res.stderr).to_string();

            if !compile_res.status.success() {
                let _ = fs::remove_dir_all(&temp_dir);
                return Ok(SimulationResult {
                    success: false,
                    output: format!("=== Verilator Compilation Failed ===\n{}{}", stdout_comp, stderr_comp),
                    vcd_content: None,
                });
            }

            // Run the compiled binary
            let bin_name = format!("V{}", top_tb);
            let bin_path = temp_dir.join("obj_dir").join(&bin_name);

            let mut sim_cmd = Command::new(&bin_path);
            sim_cmd.current_dir(&temp_dir);
            configure_tool_cmd(&mut sim_cmd, bundled_dir.as_deref());

            let sim_res = sim_cmd.output();

            let (sim_out, sim_success) = match sim_res {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let err_str = String::from_utf8_lossy(&output.stderr).to_string();
                    (format!("{}{}", out_str, err_str), output.status.success())
                }
                Err(e) => (format!("Simulation execution failed: {}", e), false),
            };

            // Search for produced VCD file in temp_dir
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

            let full_log = format!(
                "=== Verilator Simulation Report ===\n{}\n=== Run Output ===\n{}",
                stderr_comp, sim_out
            );

            let _ = fs::remove_dir_all(&temp_dir);

            return Ok(SimulationResult {
                success: sim_success,
                output: full_log,
                vcd_content,
            });
        }

        // Fallback: lint-only if no testbench
        let mut verilator_cmd = Command::new(&verilator_bin);
        verilator_cmd.arg("--lint-only").arg("-Wall").arg("-Wno-fatal");
        if has_sv {
            verilator_cmd.arg("--sv");
        }
        for file in &files {
            if file.name.ends_with(".v") || file.name.ends_with(".sv") {
                verilator_cmd.arg(temp_dir.join(&file.name));
            }
        }
        configure_tool_cmd(&mut verilator_cmd, bundled_dir.as_deref());

        let output = verilator_cmd.output().map_err(|e| format!("Failed to run verilator: {}", e))?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let full_output = format!("=== Verilator Lint Analysis ===\n{}{}", stdout, stderr);
        let _ = fs::remove_dir_all(&temp_dir);
        let is_clean = full_output.trim() == "=== Verilator Lint Analysis ===";
        return Ok(SimulationResult {
            success: output.status.success(),
            output: if is_clean {
                "=== Verilator Lint Analysis ===\n✓ No lint warnings or syntax errors found. Design is clean!".to_string()
            } else {
                full_output
            },
            vcd_content: None,
        });
    }

    // Default or both: iverilog simulation
    let vvp_file = temp_dir.join("simulation.vvp");
    let mut compile_cmd = Command::new(&iverilog_bin);
    if has_sv {
        compile_cmd.arg("-g2012");
    }
    if let Some(tc_dir) = &bundled_dir {
        let ivl_lib = tc_dir.join("lib/ivl");
        if ivl_lib.exists() {
            compile_cmd.arg("-B").arg(&ivl_lib);
        }
    }
    compile_cmd.arg("-o").arg(&vvp_file);
    for file in &files {
        if file.name.ends_with(".v") || file.name.ends_with(".sv") {
            compile_cmd.arg(temp_dir.join(&file.name));
        }
    }
    configure_tool_cmd(&mut compile_cmd, bundled_dir.as_deref());

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

    let mut run_cmd = Command::new(&vvp_bin);
    run_cmd.arg(&vvp_file);
    run_cmd.current_dir(&temp_dir);
    configure_tool_cmd(&mut run_cmd, bundled_dir.as_deref());

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

#[tauri::command]
async fn run_python(
    app: tauri::AppHandle,
    script_name: String,
    files: Vec<VerilogFile>,
    args: Vec<String>,
    toolchain: Option<ToolchainConfig>,
) -> Result<PythonResult, String> {
    let tc = toolchain.unwrap_or_default();
    let bundled_dir = find_bundled_toolchain_dir(Some(&app));
    let python_bin = resolve_tool_binary(
        "Python 3",
        "python3",
        if tc.use_custom_paths { tc.python_path.as_deref() } else { None },
        bundled_dir.as_deref(),
    );

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
    let mut cmd = Command::new(&python_bin);
    cmd.arg(&script_path);
    for arg in args {
        cmd.arg(arg);
    }
    cmd.current_dir(&temp_dir);
    configure_tool_cmd(&mut cmd, bundled_dir.as_deref());

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

#[tauri::command]
async fn synthesize(
    app: tauri::AppHandle,
    files: Vec<VerilogFile>,
    top_module: Option<String>,
    toolchain: Option<ToolchainConfig>,
) -> Result<SynthesisResult, String> {
    let tc = toolchain.unwrap_or_default();
    let bundled_dir = find_bundled_toolchain_dir(Some(&app));
    let yosys_bin = resolve_tool_binary(
        "Yosys Synthesis",
        "yosys",
        if tc.use_custom_paths { tc.yosys_path.as_deref() } else { None },
        bundled_dir.as_deref(),
    );

    let abc_cmd_part = if let Some(tc_dir) = &bundled_dir {
        let abc_bin = tc_dir.join("bin/abc");
        if abc_bin.exists() {
            format!("abc -exe {} -g AND,NAND,OR,NOR,XOR,XNOR", abc_bin.display())
        } else {
            "abc -g AND,NAND,OR,NOR,XOR,XNOR".to_string()
        }
    } else {
        "abc -g AND,NAND,OR,NOR,XOR,XNOR".to_string()
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let temp_dir = std::env::temp_dir().join(format!("verisim_synth_{}", now));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let mut declared_modules = Vec::new();
    let mut file_names = Vec::new();

    for file in &files {
        if file.name.ends_with(".v") || file.name.ends_with(".sv") || file.name.ends_with(".svh") {
            let file_path = temp_dir.join(&file.name);
            fs::write(&file_path, &file.content).map_err(|e| e.to_string())?;
            file_names.push(file.name.clone());
            let found = detect_modules(&file.content);
            for m in found {
                if !file.name.contains("_tb") && !m.ends_with("_tb") {
                    declared_modules.push(m);
                }
            }
        }
    }

    let top = match top_module {
        Some(m) if !m.trim().is_empty() => m,
        _ => declared_modules.first().cloned().unwrap_or_else(|| "top".to_string()),
    };

    let synth_gates_file = temp_dir.join("synth_gates.v");

    // Construct yosys command script
    let read_cmd = format!("read_verilog -sv {}", file_names.join(" "));
    let yosys_script = format!(
        "{}; hierarchy -check -top {}; proc; opt; fsm; opt; memory; opt; techmap; opt; {}; opt; clean; stat; write_verilog -noattr synth_gates.v",
        read_cmd, top, abc_cmd_part
    );

    let mut run_cmd = Command::new(&yosys_bin);
    run_cmd
        .arg("-p")
        .arg(&yosys_script)
        .current_dir(&temp_dir);
    configure_tool_cmd(&mut run_cmd, bundled_dir.as_deref());

    let run_res = run_cmd.output();

    match run_res {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let full_output = format!("{}\n{}", stdout, stderr);

            let (cell_counts, wire_count, bit_count, public_wires) = parse_yosys_stat(&stdout);

            let gate_verilog = fs::read_to_string(&synth_gates_file).unwrap_or_default();
            let _ = fs::remove_dir_all(&temp_dir);

            if !output.status.success() {
                return Ok(SynthesisResult {
                    success: false,
                    output: full_output,
                    gate_verilog: String::new(),
                    top_module: top,
                    cell_counts,
                    wire_count,
                    bit_count,
                    public_wires,
                    error: Some("Yosys synthesis failed. Check syntax and module hierarchy.".to_string()),
                });
            }

            Ok(SynthesisResult {
                success: true,
                output: full_output,
                gate_verilog,
                top_module: top,
                cell_counts,
                wire_count,
                bit_count,
                public_wires,
                error: None,
            })
        }
        Err(e) if e.kind() == ErrorKind::NotFound => {
            let _ = fs::remove_dir_all(&temp_dir);
            let not_found_msg = if tc.use_custom_paths && tc.yosys_path.is_some() {
                format!(
                    "Yosys binary was not found at configured path: '{}'.\n\nPlease check your toolchain path settings (Settings -> EDA Toolchain) or ensure the binary is executable.",
                    yosys_bin
                )
            } else {
                "Yosys is not installed or not found in system PATH.\n\nTo enable RTL gate-level synthesis, please install Yosys:\n  • Arch Linux:   sudo pacman -S yosys\n  • Ubuntu/Debian: sudo apt install yosys\n  • Fedora:        sudo dnf install yosys\n  • macOS:         brew install yosys\n\nAlternatively, specify a custom executable path in Settings -> EDA Toolchain.".to_string()
            };
            Ok(SynthesisResult {
                success: false,
                output: not_found_msg,
                gate_verilog: String::new(),
                top_module: top,
                cell_counts: HashMap::new(),
                wire_count: 0,
                bit_count: 0,
                public_wires: 0,
                error: Some(format!("Yosys binary '{}' not found", yosys_bin)),
            })
        }
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            Ok(SynthesisResult {
                success: false,
                output: format!("Failed to execute Yosys: {}", e),
                gate_verilog: String::new(),
                top_module: top,
                cell_counts: HashMap::new(),
                wire_count: 0,
                bit_count: 0,
                public_wires: 0,
                error: Some(e.to_string()),
            })
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            open_project,
            save_project,
            simulate,
            run_python,
            synthesize,
            read_external_files,
            check_toolchain,
            open_in_gtkwave
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_yosys_stat() {
        let sample_output = r#"
=== alu ===

   Number of wires:                 12
   Number of wire bits:             28
   Number of public wires:           8
   Number of public wire bits:      24
   Number of memories:               0
   Number of memory bits:            0
   Number of processes:              0
   Number of cells:                  7
     $_AND_                          3
     $_OR_                           2
     $_XOR_                          1
     $_DFF_P_                        1
"#;
        let (cell_counts, wire_count, bit_count, public_wires) = parse_yosys_stat(sample_output);
        assert_eq!(wire_count, 12);
        assert_eq!(bit_count, 28);
        assert_eq!(public_wires, 8);
        assert_eq!(cell_counts.get("$_AND_"), Some(&3));
        assert_eq!(cell_counts.get("$_OR_"), Some(&2));
        assert_eq!(cell_counts.get("$_XOR_"), Some(&1));
        assert_eq!(cell_counts.get("$_DFF_P_"), Some(&1));
    }

    #[test]
    fn test_detect_modules() {
        let verilog = r#"
// Top FIFO
module fifo_sync #(parameter W = 8) (input clk);
endmodule

module fifo_tb;
endmodule
"#;
        let mods = detect_modules(verilog);
        assert_eq!(mods, vec!["fifo_sync", "fifo_tb"]);
    }

    #[test]
    fn test_detect_testbench_module_dumpfile() {
        let files = vec![
            VerilogFile {
                id: "1".into(),
                name: "sim.sv".into(),
                content: "module sim_runner;\n initial begin $dumpfile(\"test.vcd\"); end\nendmodule".into(),
                file_type: "verilog".into(),
                project_id: "p".into(),
            },
            VerilogFile {
                id: "2".into(),
                name: "dut.v".into(),
                content: "module dut;\nendmodule".into(),
                file_type: "verilog".into(),
                project_id: "p".into(),
            }
        ];
        let tb = detect_testbench_module(&files);
        assert_eq!(tb, Some("sim_runner".to_string()));
    }

    #[test]
    fn test_detect_testbench_module_tb_suffix() {
        let files = vec![
            VerilogFile {
                id: "1".into(),
                name: "counter_tb.v".into(),
                content: "module testbench;\nendmodule".into(),
                file_type: "verilog".into(),
                project_id: "p".into(),
            },
            VerilogFile {
                id: "2".into(),
                name: "counter.v".into(),
                content: "module counter;\nendmodule".into(),
                file_type: "verilog".into(),
                project_id: "p".into(),
            }
        ];
        let tb = detect_testbench_module(&files);
        assert_eq!(tb, Some("testbench".to_string()));
    }

    #[test]
    fn test_project_from_verilog_file() {
        let content = "module counter(input clk); endmodule";
        let proj = project_from_verilog_file("/tmp/counter.v", content);
        assert_eq!(proj.name, "counter");
        assert_eq!(proj.files.len(), 1);
        assert_eq!(proj.files[0].name, "counter.v");
        assert_eq!(proj.files[0].file_type, "verilog");
        assert_eq!(proj.files[0].content, content);
    }

    #[test]
    fn test_verilog_file_from_path_sv() {
        let content = "module fifo_sync; endmodule";
        let vf = verilog_file_from_path("/home/user/fifo.sv", content, 0);
        assert_eq!(vf.name, "fifo.sv");
        assert_eq!(vf.file_type, "systemverilog");
        assert_eq!(vf.content, content);
    }

    #[test]
    fn test_check_toolchain_defaults() {
        let bundled = find_bundled_toolchain_dir(None);
        let health = check_toolchain_internal(bundled.as_deref(), None).expect("toolchain check should succeed");
        assert_eq!(health.iverilog.name, "Icarus Verilog");
        assert_eq!(health.vvp.name, "VVP Runtime");
        assert_eq!(health.verilator.name, "Verilator");
        assert_eq!(health.yosys.name, "Yosys Synthesis");
        assert_eq!(health.python.name, "Python 3");

        assert!(health.gtkwave.is_some());
        let gtk = health.gtkwave.as_ref().unwrap();
        assert_eq!(gtk.name, "GTKWave");

        // Verify that bundled tools were found
        assert!(health.yosys.found, "Yosys should be found in bundled toolchain");
        assert!(health.verilator.found, "Verilator should be found in bundled toolchain");
        assert!(health.iverilog.found, "Icarus Verilog should be found in bundled toolchain");
        assert!(health.vvp.found, "VVP should be found in bundled toolchain");
    }

    #[test]
    fn test_resolve_tool_nonexistent() {
        let status = resolve_tool("FakeTool", "definitely_nonexistent_binary_xyz_123", None, "--version", None);
        assert!(!status.found);
        assert!(status.error.is_some());
    }

    #[test]
    fn test_find_appdir_toolchain() {
        let temp_dir = std::env::temp_dir().join(format!("test_appdir_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        let _ = fs::create_dir_all(&temp_dir);

        // Case 1: usr/lib/verisim-ide/toolchain/bin
        let path1 = temp_dir.join("usr/lib/verisim-ide/toolchain/bin");
        fs::create_dir_all(&path1).unwrap();
        let found1 = find_appdir_toolchain(&temp_dir);
        assert_eq!(found1, Some(temp_dir.join("usr/lib/verisim-ide/toolchain")));

        // Case 2: usr/lib/toolchain/bin (remove case 1 first)
        let _ = fs::remove_dir_all(temp_dir.join("usr/lib/verisim-ide"));
        let path2 = temp_dir.join("usr/lib/toolchain/bin");
        fs::create_dir_all(&path2).unwrap();
        let found2 = find_appdir_toolchain(&temp_dir);
        assert_eq!(found2, Some(temp_dir.join("usr/lib/toolchain")));

        // Case 3: toolchain/bin (remove case 2 first)
        let _ = fs::remove_dir_all(temp_dir.join("usr/lib"));
        let path3 = temp_dir.join("toolchain/bin");
        fs::create_dir_all(&path3).unwrap();
        let found3 = find_appdir_toolchain(&temp_dir);
        assert_eq!(found3, Some(temp_dir.join("toolchain")));

        // Case 4: No bin folder exists
        let _ = fs::remove_dir_all(temp_dir.join("toolchain"));
        let found4 = find_appdir_toolchain(&temp_dir);
        assert_eq!(found4, None);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_find_exe_parent_and_cwd_toolchain() {
        let temp_dir = std::env::temp_dir().join(format!("test_exe_parent_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        let _ = fs::create_dir_all(&temp_dir);

        // Test exe parent candidates:
        // Candidate A: parent/toolchain/bin
        let tc_a = temp_dir.join("toolchain/bin");
        fs::create_dir_all(&tc_a).unwrap();
        assert_eq!(find_exe_parent_toolchain(&temp_dir), Some(temp_dir.join("toolchain")));
        let _ = fs::remove_dir_all(temp_dir.join("toolchain"));

        // Candidate B: parent/../lib/verisim-ide/toolchain/bin
        let bin_sub = temp_dir.join("bin_dir");
        let tc_b = temp_dir.join("lib/verisim-ide/toolchain/bin");
        fs::create_dir_all(&bin_sub).unwrap();
        fs::create_dir_all(&tc_b).unwrap();
        assert_eq!(find_exe_parent_toolchain(&bin_sub), Some(bin_sub.join("../lib/verisim-ide/toolchain")));

        // Test find_cwd_toolchain
        if let Ok(cwd) = std::env::current_dir() {
            let found_cwd = find_cwd_toolchain(&cwd);
            // In workspace root or src-tauri, toolchain or src-tauri/toolchain exists
            assert!(found_cwd.is_some(), "CWD toolchain candidate should be located in workspace");
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_find_bundled_toolchain_appdir_env() {
        let temp_dir = std::env::temp_dir().join(format!("test_appdir_env_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        let mock_tc = temp_dir.join("usr/lib/verisim-ide/toolchain/bin");
        fs::create_dir_all(&mock_tc).unwrap();

        let old_appdir = std::env::var("APPDIR").ok();
        std::env::set_var("APPDIR", &temp_dir);

        let resolved = find_bundled_toolchain_dir(None);
        assert_eq!(resolved, Some(temp_dir.join("usr/lib/verisim-ide/toolchain")));

        // Restore environment
        match old_appdir {
            Some(v) => std::env::set_var("APPDIR", v),
            None => std::env::remove_var("APPDIR"),
        }
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_resolve_gtkwave_mock_and_binary() {
        let temp_dir = std::env::temp_dir().join(format!("test_gtkwave_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(&temp_dir).unwrap();

        let script_path = temp_dir.join("mock_gtkwave.sh");
        let script_content = "#!/bin/sh\necho \"GTKWave Analyzer v3.3.118 (w)1999-2024 Bpt\"\n";
        fs::write(&script_path, script_content).unwrap();

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&script_path).unwrap().permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&script_path, perms).unwrap();
        }

        let script_str = script_path.to_string_lossy().to_string();

        // Test resolve_gtkwave_binary with custom path
        let resolved_bin = resolve_gtkwave_binary(Some(&script_str), None);
        assert_eq!(resolved_bin, script_str);

        // Test resolve_gtkwave with custom path
        let status = resolve_gtkwave(Some(&script_str), None);
        assert!(status.found, "Mock GTKWave should be found");
        assert!(status.version.contains("GTKWave Analyzer"), "Version should match mock script output");
        assert_eq!(status.resolved_path, script_str);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_check_toolchain_with_custom_gtkwave() {
        let mut cfg = ToolchainConfig::default();
        cfg.use_custom_paths = true;
        cfg.gtkwave_path = Some("/nonexistent/bin/gtkwave".to_string());

        let health = check_toolchain_internal(None, Some(cfg)).expect("Toolchain check should succeed");
        assert!(health.gtkwave.is_some());
        let gtk = health.gtkwave.unwrap();
        assert_eq!(gtk.name, "GTKWave");
        assert!(!gtk.found);
        assert!(gtk.error.is_some());
    }

    #[test]
    fn test_toolchain_serde_backward_compatibility() {
        // 1. ToolchainConfig deserialization without gtkwave_path (legacy frontend)
        let legacy_cfg_json = r#"{"use_custom_paths":false,"iverilog_path":null}"#;
        let parsed_cfg: ToolchainConfig = serde_json::from_str(legacy_cfg_json).unwrap();
        assert_eq!(parsed_cfg.gtkwave_path, None);
        assert!(!parsed_cfg.use_custom_paths);

        // 2. ToolchainConfig deserialization with gtkwave_path
        let new_cfg_json = r#"{"use_custom_paths":true,"gtkwave_path":"/usr/bin/gtkwave"}"#;
        let parsed_new_cfg: ToolchainConfig = serde_json::from_str(new_cfg_json).unwrap();
        assert_eq!(parsed_new_cfg.gtkwave_path, Some("/usr/bin/gtkwave".to_string()));
        assert!(parsed_new_cfg.use_custom_paths);

        // 3. ToolchainHealth deserialization without gtkwave (legacy frontend payload)
        let legacy_health_json = r#"{
            "iverilog":{"name":"Icarus","found":true,"resolved_path":"/bin/iverilog","version":"13.0","error":null},
            "vvp":{"name":"VVP","found":true,"resolved_path":"/bin/vvp","version":"13.0","error":null},
            "verilator":{"name":"Verilator","found":true,"resolved_path":"/bin/verilator","version":"5.0","error":null},
            "yosys":{"name":"Yosys","found":true,"resolved_path":"/bin/yosys","version":"0.66","error":null},
            "python":{"name":"Python 3","found":true,"resolved_path":"/bin/python3","version":"3.14","error":null}
        }"#;
        let parsed_health: ToolchainHealth = serde_json::from_str(legacy_health_json).unwrap();
        assert_eq!(parsed_health.gtkwave, None);
        assert!(parsed_health.iverilog.found);

        // 4. ToolchainHealth serialization with gtkwave
        let health = check_toolchain_internal(None, None).unwrap();
        let serialized = serde_json::to_string(&health).unwrap();
        assert!(serialized.contains("\"gtkwave\":"));
    }
}
