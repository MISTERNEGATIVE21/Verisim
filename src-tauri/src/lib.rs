use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::ErrorKind;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

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
        // Detect if there is a testbench module or $dumpfile in any file
        let testbench_module = detect_testbench_module(&files);

        // If testbench found: compile with verilator --binary --trace
        if let Some(top_tb) = testbench_module {
            let mut verilator_cmd = Command::new("verilator");
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

            let sim_res = Command::new(&bin_path)
                .current_dir(&temp_dir)
                .output();

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
        let mut verilator_cmd = Command::new("verilator");
        verilator_cmd.arg("--lint-only").arg("-Wall").arg("-Wno-fatal");
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

#[tauri::command]
async fn synthesize(files: Vec<VerilogFile>, top_module: Option<String>) -> Result<SynthesisResult, String> {
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
        "{}; hierarchy -check -top {}; proc; opt; fsm; opt; memory; opt; techmap; opt; abc -g AND,NAND,OR,NOR,XOR,XNOR; opt; clean; stat; write_verilog -noattr synth_gates.v",
        read_cmd, top
    );

    let run_res = Command::new("yosys")
        .arg("-p")
        .arg(&yosys_script)
        .current_dir(&temp_dir)
        .output();

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
            Ok(SynthesisResult {
                success: false,
                output: "Yosys is not installed or not found in system PATH.\n\nTo enable RTL gate-level synthesis, please install Yosys:\n  • Arch Linux:   sudo pacman -S yosys\n  • Ubuntu/Debian: sudo apt install yosys\n  • Fedora:        sudo dnf install yosys\n  • macOS:         brew install yosys".to_string(),
                gate_verilog: String::new(),
                top_module: top,
                cell_counts: HashMap::new(),
                wire_count: 0,
                bit_count: 0,
                public_wires: 0,
                error: Some("Yosys binary not found in PATH".to_string()),
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
            read_external_files
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
}
