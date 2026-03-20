use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use rusqlite::{params, Connection, Row};
use std::sync::Mutex;
use uuid::Uuid;
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

pub struct DbState(Mutex<Connection>);

fn map_file(row: &Row) -> rusqlite::Result<VerilogFile> {
    Ok(VerilogFile {
        id: row.get(0)?,
        name: row.get(1)?,
        content: row.get(2)?,
        file_type: row.get(3)?,
        project_id: row.get(4)?,
    })
}

fn map_project(row: &Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        files: Vec::new(),
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

#[tauri::command]
fn get_projects(state: tauri::State<DbState>) -> Result<Vec<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT id, name, description, createdAt, updatedAt FROM Project ORDER BY updatedAt DESC")
        .map_err(|e| e.to_string())?;
    
    let project_iter = stmt.query_map([], map_project).map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for project in project_iter {
        let mut p = project.map_err(|e| e.to_string())?;
        
        let mut f_stmt = conn.prepare("SELECT id, name, content, type, projectId FROM File WHERE projectId = ?")
            .map_err(|e| e.to_string())?;
        
        let file_iter = f_stmt.query_map(params![p.id], map_file).map_err(|e| e.to_string())?;

        for file in file_iter {
            p.files.push(file.map_err(|e| e.to_string())?);
        }
        projects.push(p);
    }

    Ok(projects)
}

#[tauri::command]
fn create_project(state: tauri::State<DbState>, name: String, description: String, files: Vec<VerilogFile>) -> Result<Project, String> {
    println!("Backend: create_project called with name: {}, description: {}", name, description);
    let conn = state.0.lock().map_err(|e| {
        println!("Backend: Failed to lock database: {}", e);
        e.to_string()
    })?;
    
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    println!("Backend: Inserting project with id: {}", id);
    conn.execute(
        "INSERT INTO Project (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
        params![id, name, description, now, now],
    ).map_err(|e| {
        println!("Backend: Failed to insert project: {}", e);
        e.to_string()
    })?;

    for file in files {
        let file_id = Uuid::new_v4().to_string();
        println!("Backend: Inserting file: {} with id: {}", file.name, file_id);
        conn.execute(
            "INSERT INTO File (id, name, content, type, projectId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![file_id, file.name, file.content, file.file_type, id, now, now],
        ).map_err(|e| {
            println!("Backend: Failed to insert file {}: {}", file.name, e);
            e.to_string()
        })?;
    }

    let mut p = Project {
        id: id.clone(),
        name,
        description: Some(description),
        files: Vec::new(),
        created_at: now.clone(),
        updated_at: now,
    };

    println!("Backend: Refreshing project files for id: {}", id);
    let mut f_stmt = conn.prepare("SELECT id, name, content, type, projectId FROM File WHERE projectId = ?")
        .map_err(|e| e.to_string())?;
    
    let file_iter = f_stmt.query_map(params![id], map_file).map_err(|e| e.to_string())?;

    for file in file_iter {
        p.files.push(file.map_err(|e| e.to_string())?);
    }

    println!("Backend: Project creation complete");
    Ok(p)
}

#[tauri::command]
fn update_file(state: tauri::State<DbState>, id: String, content: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE File SET content = ?, updatedAt = ? WHERE id = ?",
        params![content, now, id],
    ).map_err(|e| e.to_string())?;

    // Update project updated_at
    conn.execute(
        "UPDATE Project SET updatedAt = ? WHERE id = (SELECT projectId FROM File WHERE id = ?)",
        params![now, id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_project(state: tauri::State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Project WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_file(state: tauri::State<DbState>, project_id: String, name: String, file_type: String, content: String) -> Result<VerilogFile, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO File (id, name, content, type, projectId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, name, content, file_type, project_id, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(VerilogFile {
        id,
        name,
        content,
        file_type,
        project_id,
    })
}

#[tauri::command]
fn rename_file(state: tauri::State<DbState>, id: String, name: String) -> Result<VerilogFile, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE File SET name = ?, updatedAt = ? WHERE id = ?",
        params![name, now, id],
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, content, type, projectId FROM File WHERE id = ?")
        .map_err(|e| e.to_string())?;
    
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        map_file(row).map_err(|e| e.to_string())
    } else {
        Err("File not found".to_string())
    }
}

#[tauri::command]
fn delete_file(state: tauri::State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM File WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn simulate(files: Vec<VerilogFile>) -> Result<SimulationResult, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    
    let temp_dir = std::env::temp_dir().join(format!("verilog_{}", now));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    // Write files
    for file in &files {
        let file_path = temp_dir.join(&file.name);
        fs::write(file_path, &file.content).map_err(|e| e.to_string())?;
    }

    let vvp_file = temp_dir.join("simulation.vvp");
    
    // Compile
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

    // Run simulation
    let mut run_cmd = Command::new("vvp");
    run_cmd.arg(&vvp_file);
    run_cmd.current_dir(&temp_dir);

    let run_output = run_cmd.output().map_err(|e| format!("Failed to run vvp: {}", e))?;
    let stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&run_output.stderr).to_string();
    let full_output = format!("{}{}", stdout, stderr);

    // Read VCD
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

    // Cleanup
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
            
            println!("Backend: Using database directory: {:?}", app_dir);
            fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("verisim.db");
            println!("Backend: Database path: {:?}", db_path);
            
            let conn = Connection::open(db_path).expect("failed to open database");
            
            conn.execute(
                "CREATE TABLE IF NOT EXISTS Project (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )",
                [],
            ).expect("failed to create Project table");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS File (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    content TEXT NOT NULL DEFAULT '',
                    type TEXT NOT NULL DEFAULT 'verilog',
                    projectId TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
                )",
                [],
            ).expect("failed to create File table");

            app.manage(DbState(Mutex::new(conn)));
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
