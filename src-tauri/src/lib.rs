mod inference;
mod models;
mod storage;

use inference::FinishedEvent;
use models::LocalModel;
use std::{collections::HashMap, sync::Mutex};
use storage::{Conversation, Message, Store};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::{sync::oneshot, task::JoinHandle};

pub struct AppState {
    store: Store,
    generations: Mutex<HashMap<String, JoinHandle<()>>>,
}

#[tauri::command]
async fn discover_models() -> Result<Vec<LocalModel>, String> {
    Ok(models::discover().await)
}

#[tauri::command]
fn list_conversations(state: State<'_, AppState>) -> Result<Vec<Conversation>, String> {
    state.store.conversations()
}

#[tauri::command]
fn create_conversation(state: State<'_, AppState>, model_key: String) -> Result<Conversation, String> {
    models::select_model(&model_key)?;
    state.store.create(&model_key)
}

#[tauri::command]
fn list_messages(state: State<'_, AppState>, conversation_id: String) -> Result<Vec<Message>, String> {
    state.store.messages(&conversation_id)
}

#[tauri::command]
fn append_message(
    state: State<'_, AppState>,
    conversation_id: String,
    content: String,
) -> Result<Message, String> {
    state.store.append_user(&conversation_id, &content)
}

#[tauri::command]
fn delete_conversation(state: State<'_, AppState>, conversation_id: String) -> Result<(), String> {
    state.store.delete(&conversation_id)
}

#[tauri::command]
async fn start_chat(
    app: AppHandle,
    state: State<'_, AppState>,
    conversation_id: String,
    model_key: String,
    request_id: String,
) -> Result<(), String> {
    if uuid::Uuid::parse_str(&request_id).is_err() {
        return Err("Invalid request ID.".into());
    }
    let history = state.store.history_for_model(&conversation_id, &model_key)?;
    models::select_model(&model_key)?;
    let app_for_task = app.clone();
    let request_for_task = request_id.clone();
    let conversation_for_task = conversation_id.clone();
    let (tx, rx) = oneshot::channel::<()>();

    // The gate ensures the task cannot finish before it has been registered.
    let handle = tauri::async_runtime::spawn(async move {
        if rx.await.is_err() { return; }
        let result = inference::stream_chat(&app_for_task, &history, &model_key, &request_for_task).await;
        let final_result = match result {
            Ok(text) => match app_for_task.state::<AppState>().store.append_assistant(&conversation_for_task, &text) {
                Ok(_) => Ok(text),
                Err(error) => Err(format!("Generated response could not be saved: {error}")),
            },
            Err(error) => Err(error),
        };
        let _ = app_for_task.emit("novasonic://chat-finished", FinishedEvent {
            request_id: request_for_task.clone(),
            text: final_result.as_ref().ok().cloned().unwrap_or_default(),
            error: final_result.err(),
        });
        if let Ok(mut running) = app_for_task.state::<AppState>().generations.lock() {
            running.remove(&request_for_task);
        }
    });

    {
        let mut running = state.generations.lock().map_err(|_| "Generation lock error")?;
        if running.contains_key(&request_id) {
            handle.abort();
            return Err("Request ID is already active.".into());
        }
        running.insert(request_id, handle);
    }
    let _ = tx.send(());
    Ok(())
}

#[tauri::command]
fn cancel_chat(app: AppHandle, state: State<'_, AppState>, request_id: String) -> Result<(), String> {
    let handle = {
        state.generations.lock().map_err(|_| "Generation lock error")?.remove(&request_id)
    };
    if let Some(handle) = handle {
        handle.abort();
        let _ = app.emit("novasonic://chat-finished", FinishedEvent {
            request_id, text: String::new(), error: Some("Cancelled".into())
        });
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir().map_err(|e| format!("Cannot resolve app data path: {e}"))?;
            let store = Store::open(dir)?;
            app.manage(AppState { store, generations: Mutex::new(HashMap::new()) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            discover_models,
            list_conversations,
            create_conversation,
            list_messages,
            append_message,
            delete_conversation,
            start_chat,
            cancel_chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running NovaSonic");
}
