// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

mod openai_client;
use openai_client::{OpenAIClient, LLMResponse, TimelineEvent};

// Data structures matching the frontend types
#[derive(Serialize, Deserialize, Clone, Debug)]
struct Description {
    id: String,
    text: String,
    is_important: bool,
    origin_star_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct DraftTab {
    id: String,
    scene_id: String,
    index: u32,
    timeline: Vec<TimelineEvent>,
    descriptions: Vec<Description>,
    summary: Option<String>,
    fulfilled_plan_steps: Vec<String>,
    suggested_plan_steps: Vec<String>,
    created_at: u64,
    updated_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Character {
    id: String,
    name: String,
    fields: std::collections::HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct StarTags {
    characters: Vec<String>,
    scope: String, // "CurrentScene" | "FuturePlot" | "Backstory" | "Worldbuilding"
    status: String, // "Active" | "Resolved" | "Deferred"
    custom: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Star {
    id: String,
    title: String,
    body: String,
    tags: StarTags,
    priority: f64,
    is_checked: bool,
    origin_draft_tab_id: Option<String>,
    created_at: u64,
    last_used_in_prompt: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct PlanStep {
    id: String,
    text: String,
    fulfilled_by: Vec<String>,
    linked_stars: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ScenePlan {
    raw_text: String,
    parsed_steps: Vec<PlanStep>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Scene {
    id: String,
    name: String,
    setting: Option<String>,
    backstory: Option<String>,
    plan: ScenePlan,
    draft_tab_ids: Vec<String>,
    created_at: u64,
    updated_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct IdeaBank {
    stored_draft_tab_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ProjectMetadata {
    title: String,
    author: Option<String>,
    created_at: u64,
    updated_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ProjectData {
    version: String,
    metadata: ProjectMetadata,
    scenes: std::collections::HashMap<String, Scene>,
    draft_tabs: std::collections::HashMap<String, DraftTab>,
    stars: std::collections::HashMap<String, Star>,
    characters: std::collections::HashMap<String, Character>,
    plan_steps: std::collections::HashMap<String, PlanStep>,
    idea_bank: IdeaBank,
    active_scene_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct ApiError {
    error: bool,
    message: String,
    code: Option<String>,
}

// Application state
struct AppConfig {
    project_dir: PathBuf,
    openai_client: OpenAIClient,
}

impl AppConfig {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Create project storage directory
        let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
        let project_dir = home_dir.join("Documents").join("SpicaWriter");
        
        if !project_dir.exists() {
            fs::create_dir_all(&project_dir)?;
        }

        // Initialize OpenAI client
        let openai_client = OpenAIClient::new()?;

        Ok(Self {
            project_dir,
            openai_client,
        })
    }

    fn get_project_path(&self) -> PathBuf {
        self.project_dir.join("last_project.json")
    }
}

// Parse LLM response into timeline events
fn parse_timeline_from_response(response: &str) -> Vec<TimelineEvent> {
    let mut timeline = Vec::new();
    
    for line in response.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        
        // Check if line contains dialogue (indicated by quotes)
        if let Some(dialogue_start) = line.find('"') {
            if let Some(dialogue_end) = line.rfind('"') {
                if dialogue_start < dialogue_end {
                    let text_part = line[..dialogue_start].trim();
                    let dialogue_part = line[dialogue_start + 1..dialogue_end].trim();
                    
                    timeline.push(TimelineEvent {
                        text: text_part.to_string(),
                        dialogue: if dialogue_part.is_empty() { None } else { Some(dialogue_part.to_string()) },
                    });
                    continue;
                }
            }
        }
        
        // Regular text event
        timeline.push(TimelineEvent {
            text: line.to_string(),
            dialogue: None,
        });
    }
    
    if timeline.is_empty() {
        // Fallback: create a single event with the entire response
        timeline.push(TimelineEvent {
            text: response.trim().to_string(),
            dialogue: None,
        });
    }
    
    timeline
}

// Tauri commands
#[tauri::command]
async fn send_prompt(system_prompt: String, user_prompt: String, state: State<'_, AppConfig>) -> Result<LLMResponse, ApiError> {
    match state.openai_client.send_prompt(&system_prompt, &user_prompt).await {
        Ok(response) => {
            // Parse the response into timeline events
            let timeline = parse_timeline_from_response(&response);
            
            let tabs = vec![
                openai_client::LLMTab {
                    title: "Generated Scene Segment".to_string(),
                    timeline,
                }
            ];
            
            Ok(LLMResponse { tabs })
        }
        Err(e) => Err(ApiError {
            error: true,
            message: format!("Failed to process prompt: {}", e),
            code: Some("LLM_ERROR".to_string()),
        })
    }
}

#[tauri::command]
async fn save_project(state_json: String, config: State<'_, AppConfig>) -> Result<(), ApiError> {
    let project_path = config.get_project_path();
    
    match fs::write(&project_path, state_json) {
        Ok(_) => Ok(()),
        Err(e) => Err(ApiError {
            error: true,
            message: format!("Failed to save project: {}", e),
            code: Some("SAVE_ERROR".to_string()),
        })
    }
}

#[tauri::command]
async fn save_project_as(state_json: String) -> Result<(), ApiError> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    // Get the default project directory
    let home_dir = dirs::home_dir().ok_or(ApiError {
        error: true,
        message: "Could not find home directory".to_string(),
        code: Some("HOME_DIR_ERROR".to_string()),
    })?;
    let project_dir = home_dir.join("Documents").join("SpicaWriter");
    
    let file_path = FileDialogBuilder::new()
        .set_title("Save Project As")
        .add_filter("Spica Projects", &["json"])
        .set_file_name("project.json")
        .set_directory(&project_dir)  // Start in the default project directory
        .save_file();
    
    if let Some(path) = file_path {
        match fs::write(&path, state_json) {
            Ok(_) => Ok(()),
            Err(e) => Err(ApiError {
                error: true,
                message: format!("Failed to save project: {}", e),
                code: Some("SAVE_ERROR".to_string()),
            })
        }
    } else {
        Err(ApiError {
            error: true,
            message: "Save cancelled by user".to_string(),
            code: Some("SAVE_CANCELLED".to_string()),
        })
    }
}

#[tauri::command]
async fn load_project(config: State<'_, AppConfig>) -> Result<String, ApiError> {
    let project_path = config.get_project_path();
    
    if !project_path.exists() {
        // Return empty state if no project exists
        let empty_project = ProjectData {
            version: "1.0".to_string(),
            metadata: ProjectMetadata {
                title: "New Project".to_string(),
                author: None,
                created_at: chrono::Utc::now().timestamp_millis() as u64,
                updated_at: chrono::Utc::now().timestamp_millis() as u64,
            },
            scenes: std::collections::HashMap::new(),
            draft_tabs: std::collections::HashMap::new(),
            stars: std::collections::HashMap::new(),
            characters: std::collections::HashMap::new(),
            plan_steps: std::collections::HashMap::new(),
            idea_bank: IdeaBank {
                stored_draft_tab_ids: Vec::new(),
            },
            active_scene_id: None,
        };
        
        return Ok(serde_json::to_string(&empty_project).unwrap());
    }
    
    match fs::read_to_string(&project_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(ApiError {
            error: true,
            message: format!("Failed to load project: {}", e),
            code: Some("LOAD_ERROR".to_string()),
        })
    }
}

#[tauri::command]
async fn load_project_from_file() -> Result<String, ApiError> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    // Get the default project directory
    let home_dir = dirs::home_dir().ok_or(ApiError {
        error: true,
        message: "Could not find home directory".to_string(),
        code: Some("HOME_DIR_ERROR".to_string()),
    })?;
    let project_dir = home_dir.join("Documents").join("SpicaWriter");
    
    let file_path = FileDialogBuilder::new()
        .set_title("Load Project")
        .add_filter("Spica Projects", &["json"])
        .set_directory(&project_dir)  // Start in the default project directory
        .pick_file();
    
    if let Some(path) = file_path {
        match fs::read_to_string(&path) {
            Ok(content) => Ok(content),
            Err(e) => Err(ApiError {
                error: true,
                message: format!("Failed to load project: {}", e),
                code: Some("LOAD_ERROR".to_string()),
            })
        }
    } else {
        Err(ApiError {
            error: true,
            message: "Load cancelled by user".to_string(),
            code: Some("LOAD_CANCELLED".to_string()),
        })
    }
}

#[tauri::command]
async fn create_new_project_path(config: State<'_, AppConfig>) -> Result<String, ApiError> {
    // For now, return the default path
    // In the future, this could open a file dialog
    Ok(config.get_project_path().to_string_lossy().to_string())
}

fn main() {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize application config
    let app_config = match AppConfig::new() {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Failed to initialize application: {}", e);
            std::process::exit(1);
        }
    };

    tauri::Builder::default()
        .manage(app_config)
        .invoke_handler(tauri::generate_handler![
            send_prompt,
            save_project,
            load_project,
            save_project_as,
            load_project_from_file,
            create_new_project_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 