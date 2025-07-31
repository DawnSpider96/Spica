use reqwest;
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug)]
pub enum ClientError {
    NetworkError(reqwest::Error),
    ApiError(String),
    ConfigError(String),
    OpenAIError(String),
}

impl std::fmt::Display for ClientError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ClientError::NetworkError(e) => write!(f, "Network error: {}", e),
            ClientError::ApiError(msg) => write!(f, "API error: {}", msg),
            ClientError::ConfigError(msg) => write!(f, "Config error: {}", msg),
            ClientError::OpenAIError(msg) => write!(f, "OpenAI error: {}", msg),
        }
    }
}

impl std::error::Error for ClientError {}

impl From<reqwest::Error> for ClientError {
    fn from(error: reqwest::Error) -> Self {
        ClientError::NetworkError(error)
    }
}

impl From<String> for ClientError {
    fn from(error: String) -> Self {
        ClientError::ApiError(error)
    }
}

#[derive(Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OpenAIPrompt {
    model: String,
    messages: Vec<Message>,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Deserialize, Debug)]
struct OpenAIError {
    error: ErrorDetails,
}

#[derive(Deserialize, Debug)]
struct ErrorDetails {
    message: String,
    #[serde(rename = "type")]
    #[allow(dead_code)]
    error_type: String,
    code: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TimelineEvent {
    pub text: String,
    pub dialogue: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LLMTab {
    pub title: String,
    pub timeline: Vec<TimelineEvent>,
    pub summary: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct LLMResponse {
    pub tabs: Vec<LLMTab>,
}

pub struct OpenAIClient {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
    model: String,
}

impl OpenAIClient {
    pub fn new() -> Result<Self, ClientError> {
        let api_key = env::var("OPENAI_API_KEY")
            .map_err(|_| ClientError::ConfigError("OPENAI_API_KEY not found in environment".to_string()))?;
        
        Ok(Self {
            client: reqwest::Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
            // model: "gpt-4o-mini".to_string(),
            model: "gpt-4o".to_string(),
        })
    }

    pub async fn send_prompt(&self, system_prompt: &str, user_prompt: &str) -> Result<String, ClientError> {
        let request_body = OpenAIPrompt {
            model: self.model.clone(),
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: system_prompt.to_string(),
                },
                Message {
                    role: "user".to_string(),
                    content: user_prompt.to_string(),
                }
            ],
        };

        let response = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await?;
            
            // Try to parse as structured OpenAI error
            if let Ok(error_response) = serde_json::from_str::<OpenAIError>(&error_text) {
                return Err(ClientError::OpenAIError(format!("OpenAI API Error ({}): {} ({})", 
                                  status,
                                  error_response.error.message, 
                                  error_response.error.code)));
            } else {
                // Fallback for non-JSON errors (server errors, etc.)
                return Err(ClientError::ApiError(format!("HTTP Error {}: {}", status, error_text)));
            }
        }

        let success_response: OpenAIResponse = response.json().await?;
        Ok(success_response.choices[0].message.content.clone())
    }
} 