// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

mod openai_client;
use openai_client::{OpenAIClient, LLMResponse};

// #[derive(Serialize, Deserialize, Clone, Debug)]
// struct Prompt {
//     id: String,
//     text: String,
//     timestamp: u64,
// }

// Data structures matching the frontend types
#[derive(Serialize, Deserialize, Clone, Debug)]
struct DraftTab {
    id: String,
    title: String,
    content: String,
    metadata: Option<serde_json::Value>,
    #[serde(rename = "createdAt")]
    created_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Character {
    id: String,
    name: String,
    description: String,
    tags: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Star {
    id: String,
    title: String,
    content: String,
    tags: Option<Vec<String>>,
    #[serde(rename = "linkedTabId")]
    linked_tab_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Blueprint {
    setting: String,
    characters: Vec<Character>,
    stars: Vec<Star>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct AppState {
    // prompts: Vec<Prompt>,
    #[serde(rename = "draftTabs")]
    draft_tabs: Vec<DraftTab>,
    #[serde(rename = "sceneTabIds")]
    scene_tab_ids: Vec<String>,
    blueprint: Blueprint,
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

// Tauri commands
#[tauri::command]
async fn send_prompt(prompt: String, state: State<'_, AppConfig>) -> Result<LLMResponse, ApiError> {
    match state.openai_client.send_prompt(&prompt).await {
        Ok(response) => {
            // Parse the response and create structured tabs
            let tabs = vec![
                openai_client::LLMTab {
                    title: "Generated Content".to_string(),
                    content: response,
                    tab_type: Some("dialogue".to_string()),
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
async fn load_project(config: State<'_, AppConfig>) -> Result<String, ApiError> {
    let project_path = config.get_project_path();
    
    if !project_path.exists() {
        // Return empty state if no project exists
        let empty_state = AppState {
            // prompts: vec![],
            draft_tabs: vec![],
            scene_tab_ids: vec![],
            blueprint: Blueprint {
                setting: String::new(),
                characters: vec![],
                stars: vec![],
            },
        };
        
        return Ok(serde_json::to_string(&empty_state).unwrap());
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
            create_new_project_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 