use serde::{Deserialize, Serialize};
use std::fs;
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

#[tauri::command]
fn open_project(path: String) -> Result<Project, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let project: Project = serde_json::from_str(&content).map_err(|e| format!("Failed to parse project file: {}", e))?;
    Ok(project)
}

#[tauri::command]
fn save_project(path: String, project: Project) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&project).map_err(|e| format!("Failed to serialize project: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write save file: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn simulate(files: Vec<VerilogFile>) -> Result<SimulationResult, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    
    let temp_dir = std::env::temp_dir().join(format!("verisim_{}", now));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    for file in &files {
        let file_path = temp_dir.join(&file.name);
        fs::write(file_path, &file.content).map_err(|e| e.to_string())?;
    }

    let vvp_file = temp_dir.join("simulation.vvp");
    
    let mut compile_cmd = Command::new("iverilog");
    compile_cmd.arg("-o").arg(&vvp_file);
    for file in &files {
        compile_cmd.arg(temp_dir.join(&file.name));
    }

    let compile_output = compile_cmd.output().map_err(|e| format!("Failed to run iverilog: {}", e))?;
    
    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        return Ok(SimulationResult {
            success: false,
            output: stderr,
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
            simulate
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
