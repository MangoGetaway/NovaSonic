use crate::{models, storage::Message};
use futures_util::StreamExt;
use serde::Serialize;
use serde_json::{json, Value};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct DeltaEvent {
    pub request_id: String,
    pub text: String,
}

#[derive(Clone, Serialize)]
pub struct FinishedEvent {
    pub request_id: String,
    pub text: String,
    pub error: Option<String>,
}

fn extract_delta(line: &[u8], ollama: bool) -> Result<Option<String>, String> {
    let text = std::str::from_utf8(line).map_err(|_| "Invalid UTF-8 from local model".to_owned())?.trim();
    if text.is_empty() { return Ok(None); }
    let data = if ollama {
        text
    } else {
        if !text.starts_with("data:") { return Ok(None); }
        text.trim_start_matches("data:").trim()
    };
    if data == "[DONE]" { return Ok(None); }
    let payload: Value = serde_json::from_str(data).map_err(|_| "Malformed streaming response from local model".to_owned())?;
    if let Some(error) = payload.get("error") {
        return Err(format!("Local model error: {}", error.to_string().chars().take(300).collect::<String>()));
    }
    let delta = if ollama {
        payload.pointer("/message/content").and_then(Value::as_str)
    } else {
        payload.pointer("/choices/0/delta/content").and_then(Value::as_str)
    };
    Ok(delta.filter(|s| !s.is_empty()).map(str::to_owned))
}

pub async fn stream_chat(
    app: &AppHandle,
    history: &[Message],
    model_key: &str,
    request_id: &str
) -> Result<String, String> {
    let selected = models::select_model(model_key)?;
    let messages: Vec<Value> = history.iter().map(|m| json!({
        "role": m.role,
        "content": m.content
    })).collect();
    // No remote fallback is ever introduced: endpoint selection is wholly in Rust.
    let body = if selected.ollama {
        json!({ "model": selected.id, "messages": messages, "stream": true })
    } else {
        json!({ "model": selected.id, "messages": messages, "stream": true })
    };
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(3))
        .build().map_err(|e| e.to_string())?;
    let response = client.post(&selected.chat_url).json(&body).send().await
        .map_err(|e| format!("Cannot contact local model server: {e}"))?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Local server returned {status}: {}", body.chars().take(260).collect::<String>()));
    }

    let mut stream = response.bytes_stream();
    let mut pending = Vec::<u8>::new();
    let mut completed = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Local stream interrupted: {e}"))?;
        pending.extend_from_slice(&chunk);
        if pending.len() > 2_000_000 {
            return Err("Local model produced an oversized stream segment.".into());
        }
        while let Some(newline) = pending.iter().position(|b| *b == b'\n') {
            let line: Vec<u8> = pending.drain(..=newline).collect();
            if let Some(delta) = extract_delta(&line, selected.ollama)? {
                completed.push_str(&delta);
                if completed.len() > 2_000_000 {
                    return Err("Generation exceeded the current response limit.".into());
                }
                let _ = app.emit("novasonic://chat-delta", DeltaEvent {
                    request_id: request_id.to_owned(),
                    text: delta,
                });
            }
        }
    }
    if !pending.is_empty() {
        if let Some(delta) = extract_delta(&pending, selected.ollama)? {
            completed.push_str(&delta);
            let _ = app.emit("novasonic://chat-delta", DeltaEvent {
                request_id: request_id.to_owned(), text: delta
            });
        }
    }
    if completed.is_empty() {
        return Err("Local model returned no text. Check model and runtime compatibility.".into());
    }
    Ok(completed)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parses_both_local_stream_protocols() {
        let ollama = br#"{"message":{"role":"assistant","content":"Hi"}}"#;
        let openai = br#"data: {"choices":[{"delta":{"content":"Hello"}}]}"#;
        assert_eq!(extract_delta(ollama,true).unwrap(),Some("Hi".into()));
        assert_eq!(extract_delta(openai,false).unwrap(),Some("Hello".into()));
        assert_eq!(extract_delta(b"data: [DONE]",false).unwrap(),None);
    }
}
