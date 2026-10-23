use futures_util::future::join_all;
use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use std::{collections::HashSet, time::Duration};

#[derive(Debug, Clone, Serialize)]
pub struct LocalModel {
    pub key: String,
    pub provider: String,
    pub id: String,
    pub label: String,
}

#[derive(Clone, Copy)]
struct Runtime {
    id: &'static str,
    base: &'static str,
    list_path: &'static str,
    ollama: bool,
}

const RUNTIMES: [Runtime; 3] = [
    Runtime { id: "ollama", base: "http://127.0.0.1:11434", list_path: "/api/tags", ollama: true },
    Runtime { id: "lmstudio", base: "http://127.0.0.1:1234", list_path: "/v1/models", ollama: false },
    Runtime { id: "llamacpp", base: "http://127.0.0.1:8080", list_path: "/v1/models", ollama: false },
];

pub struct SelectedModel {
    pub id: String,
    pub chat_url: String,
    pub ollama: bool,
}

/// Only fixed 127.0.0.1 endpoints are reachable. Never accept hostnames or URLs from the UI.
pub fn select_model(key: &str) -> Result<SelectedModel, String> {
    let (provider, id) = key
        .split_once("::")
        .ok_or_else(|| "Invalid model identifier.".to_string())?;
    if id.is_empty() || id.len() > 400 || id.chars().any(|c| c.is_control()) {
        return Err("Invalid model name.".into());
    }
    let runtime = RUNTIMES.iter()
        .find(|runtime| runtime.id == provider)
        .ok_or_else(|| "Unknown local model provider.".to_string())?;
    Ok(SelectedModel {
        id: id.to_owned(),
        chat_url: format!("{}{}", runtime.base, if runtime.ollama { "/api/chat" } else { "/v1/chat/completions" }),
        ollama: runtime.ollama,
    })
}

async fn models_for(client: Client, runtime: Runtime) -> Vec<LocalModel> {
    let url = format!("{}{}", runtime.base, runtime.list_path);
    let result = async {
        let response = client.get(url).send().await.map_err(|_| ())?;
        let response = response.error_for_status().map_err(|_| ())?;
        response.json::<Value>().await.map_err(|_| ())
    }.await;

    let payload = match result { Ok(value) => value, Err(_) => return Vec::new() };
    let items = if runtime.ollama {
        payload.get("models").and_then(Value::as_array)
    } else {
        payload.get("data").and_then(Value::as_array)
    };
    let mut seen = HashSet::new();
    items.into_iter().flatten().filter_map(|item| {
        let id = item.get(if runtime.ollama { "name" } else { "id" })?.as_str()?;
        if id.is_empty() || id.len() > 400 || !seen.insert(id.to_owned()) { return None; }
        Some(LocalModel {
            key: format!("{}::{}", runtime.id, id),
            provider: runtime.id.to_owned(),
            id: id.to_owned(),
            label: id.to_owned(),
        })
    }).collect()
}

pub async fn discover() -> Vec<LocalModel> {
    let client = match Client::builder()
        .timeout(Duration::from_secs(3))
        .connect_timeout(Duration::from_secs(2))
        .build() {
            Ok(client) => client,
            Err(_) => return Vec::new(),
        };
    join_all(RUNTIMES.into_iter().map(|runtime| models_for(client.clone(), runtime)))
        .await.into_iter().flatten().collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn provider_keys_cannot_redirect_to_external_urls() {
        assert!(select_model("evil::abc").is_err());
        assert!(select_model("ollama::").is_err());
        let selected = select_model("ollama::local-model").unwrap();
        assert_eq!(selected.chat_url, "http://127.0.0.1:11434/api/chat");
    }
}
