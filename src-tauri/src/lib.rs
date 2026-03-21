use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use chrono::Utc;

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
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
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

pub struct AppState {
    pub projects_dir: PathBuf,
}

fn get_project_metadata(projects_dir: &PathBuf, project_id: &str) -> Option<ProjectMetadata> {
    let metadata_path = projects_dir.join(project_id).join("project.json");
    if metadata_path.exists() {
        if let Ok(content) = fs::read_to_string(&metadata_path) {
            if let Ok(metadata) = serde_json::from_str::<ProjectMetadata>(&content) {
                return Some(metadata);
            }
        }
    }
    None
}

fn save_project_metadata(projects_dir: &PathBuf, metadata: &ProjectMetadata) -> Result<(), String> {
    let metadata_path = projects_dir.join(&metadata.id).join("project.json");
    let content = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
    fs::write(metadata_path, content).map_err(|e| e.to_string())
}

fn parse_file_id(id: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = id.splitn(2, ':').collect();
    if parts.len() == 2 {
        Some((parts[0].to_string(), parts[1].to_string()))
    } else {
        None
    }
}

#[tauri::command]
fn get_projects(state: tauri::State<AppState>) -> Result<Vec<Project>, String> {
    let projects_dir = &state.projects_dir;
    let mut projects = Vec::new();

    if let Ok(entries) = fs::read_dir(projects_dir) {
        for entry in entries.flatten() {
            if entry.file_type().map_or(false, |ft| ft.is_dir()) {
                let project_id = entry.file_name().into_string().unwrap_or_default();
                if let Some(metadata) = get_project_metadata(projects_dir, &project_id) {
                    let mut files = Vec::new();
                    if let Ok(file_entries) = fs::read_dir(entry.path()) {
                        for file_entry in file_entries.flatten() {
                            let file_name = file_entry.file_name().into_string().unwrap_or_default();
                            if file_name.ends_with(".v") || file_name.ends_with(".sv") {
                                if let Ok(content) = fs::read_to_string(file_entry.path()) {
                                    let is_tb = file_name.ends_with("_tb.v") || file_name.contains("testbench");
                                    files.push(VerilogFile {
                                        id: format!("{}:{}", project_id, file_name),
                                        name: file_name,
                                        content,
                                        file_type: if is_tb { "testbench".into() } else { "verilog".into() },
                                        project_id: project_id.clone(),
                                    });
                                }
                            }
                        }
                    }
                    projects.push(Project {
                        id: metadata.id,
                        name: metadata.name,
                        description: metadata.description,
                        files,
                        created_at: metadata.created_at,
                        updated_at: metadata.updated_at,
                    });
                }
            }
        }
    }
    
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(projects)
}

#[tauri::command]
fn create_project(state: tauri::State<AppState>, name: String, description: String, files: Vec<VerilogFile>) -> Result<Project, String> {
    let projects_dir = &state.projects_dir;
    let id = name.trim().replace(" ", "_"); // Basic slugification for the folder name
    let project_dir = projects_dir.join(&id);

    if project_dir.exists() {
        return Err("Project already exists".into());
    }

    fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let metadata = ProjectMetadata {
        id: id.clone(),
        name: name.clone(),
        description: Some(description),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    save_project_metadata(projects_dir, &metadata)?;

    let mut project_files = Vec::new();
    for file in files {
        let file_path = project_dir.join(&file.name);
        fs::write(&file_path, &file.content).map_err(|e| e.to_string())?;
        
        project_files.push(VerilogFile {
            id: format!("{}:{}", id, file.name),
            name: file.name.clone(),
            content: file.content,
            file_type: file.file_type,
            project_id: id.clone(),
        });
    }

    Ok(Project {
        id,
        name,
        description: metadata.description,
        files: project_files,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn update_file(state: tauri::State<AppState>, id: String, content: String) -> Result<(), String> {
    let (project_id, file_name) = parse_file_id(&id).ok_or("Invalid file ID format")?;
    let projects_dir = &state.projects_dir;
    let file_path = projects_dir.join(&project_id).join(&file_name);
    
    fs::write(file_path, content).map_err(|e| e.to_string())?;

    if let Some(mut metadata) = get_project_metadata(projects_dir, &project_id) {
        metadata.updated_at = Utc::now().to_rfc3339();
        let _ = save_project_metadata(projects_dir, &metadata);
    }
    
    Ok(())
}

#[tauri::command]
fn delete_project(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let project_dir = state.projects_dir.join(&id);
    fs::remove_dir_all(project_dir).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_file(state: tauri::State<AppState>, project_id: String, name: String, file_type: String, content: String) -> Result<VerilogFile, String> {
    let projects_dir = &state.projects_dir;
    let file_path = projects_dir.join(&project_id).join(&name);
    
    fs::write(&file_path, &content).map_err(|e| e.to_string())?;
    
    if let Some(mut metadata) = get_project_metadata(projects_dir, &project_id) {
        metadata.updated_at = Utc::now().to_rfc3339();
        let _ = save_project_metadata(projects_dir, &metadata);
    }

    Ok(VerilogFile {
        id: format!("{}:{}", project_id, name),
        name: name.clone(),
        content,
        file_type,
        project_id,
    })
}

#[tauri::command]
fn rename_file(state: tauri::State<AppState>, id: String, name: String) -> Result<VerilogFile, String> {
    let (project_id, old_file_name) = parse_file_id(&id).ok_or("Invalid file ID format")?;
    let projects_dir = &state.projects_dir;
    let project_dir = projects_dir.join(&project_id);
    let old_path = project_dir.join(&old_file_name);
    let new_path = project_dir.join(&name);
    
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    
    if let Some(mut metadata) = get_project_metadata(projects_dir, &project_id) {
        metadata.updated_at = Utc::now().to_rfc3339();
        let _ = save_project_metadata(projects_dir, &metadata);
    }
    
    let content = fs::read_to_string(&new_path).unwrap_or_default();
    let is_tb = name.ends_with("_tb.v") || name.contains("testbench");
    
    Ok(VerilogFile {
        id: format!("{}:{}", project_id, name),
        name: name.clone(),
        content,
        file_type: if is_tb { "testbench".into() } else { "verilog".into() },
        project_id,
    })
}

#[tauri::command]
fn delete_file(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let (project_id, file_name) = parse_file_id(&id).ok_or("Invalid file ID format")?;
    let file_path = state.projects_dir.join(&project_id).join(&file_name);
    fs::remove_file(file_path).map_err(|e| e.to_string())?;
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
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                std::env::current_dir().expect("failed to get current dir")
            });
            
            let projects_dir = app_dir.join("projects");
            println!("Backend: Using projects directory: {:?}", projects_dir);
            fs::create_dir_all(&projects_dir).expect("failed to create projects directory");
            
            app.manage(AppState { projects_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_projects, 
            create_project, 
            update_file, 
            delete_project,
            create_file,
            rename_file,
            delete_file,
            simulate
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
