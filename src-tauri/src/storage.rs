use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::{path::PathBuf, sync::Mutex};
use uuid::Uuid;

fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

#[derive(Debug, Clone, Serialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub model_key: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

pub struct Store {
    conn: Mutex<Connection>,
}

impl Store {
    pub fn open(data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&data_dir).map_err(|e| format!("Cannot create app data directory: {e}"))?;
        let connection = Connection::open(data_dir.join("novasonic.sqlite3"))
            .map_err(|e| format!("Cannot open local database: {e}"))?;
        connection.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;
             CREATE TABLE IF NOT EXISTS conversations (
               id TEXT PRIMARY KEY,
               title TEXT NOT NULL,
               model_key TEXT NOT NULL,
               created_at TEXT NOT NULL,
               updated_at TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS messages (
               id TEXT PRIMARY KEY,
               conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
               role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
               content TEXT NOT NULL,
               created_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_messages_chat_time
               ON messages(conversation_id, created_at);
             CREATE INDEX IF NOT EXISTS idx_conversations_recent
               ON conversations(updated_at DESC);"
        ).map_err(|e| format!("Cannot initialize local database: {e}"))?;
        Ok(Self { conn: Mutex::new(connection) })
    }

    pub fn conversations(&self) -> Result<Vec<Conversation>, String> {
        let conn = self.conn.lock().map_err(|_| "Database lock error")?;
        let mut stmt = conn.prepare(
            "SELECT id, title, model_key, created_at, updated_at
             FROM conversations ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(Conversation {
            id: r.get(0)?, title: r.get(1)?, model_key: r.get(2)?,
            created_at: r.get(3)?, updated_at: r.get(4)?
        })).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn create(&self, model_key: &str) -> Result<Conversation, String> {
        if model_key.len() > 500 { return Err("Model identifier is too long.".into()); }
        let chat = Conversation {
            id: Uuid::new_v4().to_string(),
            title: "New conversation".into(),
            model_key: model_key.to_owned(),
            created_at: now(),
            updated_at: now(),
        };
        let conn = self.conn.lock().map_err(|_| "Database lock error")?;
        conn.execute(
            "INSERT INTO conversations(id,title,model_key,created_at,updated_at) VALUES (?1,?2,?3,?4,?5)",
            params![chat.id, chat.title, chat.model_key, chat.created_at, chat.updated_at]
        ).map_err(|e| e.to_string())?;
        Ok(chat)
    }

    pub fn messages(&self, conversation_id: &str) -> Result<Vec<Message>, String> {
        let conn = self.conn.lock().map_err(|_| "Database lock error")?;
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM conversations WHERE id=?1)",
            [conversation_id], |r| r.get(0)
        ).map_err(|e| e.to_string())?;
        if !exists { return Err("Conversation does not exist.".into()); }
        let mut stmt = conn.prepare(
            "SELECT id,conversation_id,role,content,created_at FROM messages
             WHERE conversation_id=?1 ORDER BY created_at ASC,rowid ASC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([conversation_id], |r| Ok(Message {
            id: r.get(0)?, conversation_id: r.get(1)?,
            role: r.get(2)?, content: r.get(3)?, created_at: r.get(4)?
        })).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
    }

    fn append(&self, conversation_id: &str, role: &str, content: &str) -> Result<Message, String> {
        if content.trim().is_empty() || content.len() > 1_000_000 {
            return Err("Message must contain 1 to 1,000,000 bytes.".into());
        }
        let message = Message {
            id: Uuid::new_v4().to_string(), conversation_id: conversation_id.to_owned(),
            role: role.to_owned(), content: content.to_owned(), created_at: now(),
        };
        let mut conn = self.conn.lock().map_err(|_| "Database lock error")?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let model_exists: bool = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM conversations WHERE id=?1)", [conversation_id], |r| r.get(0)
        ).map_err(|e| e.to_string())?;
        if !model_exists { return Err("Conversation does not exist.".into()); }
        tx.execute(
            "INSERT INTO messages(id,conversation_id,role,content,created_at) VALUES (?1,?2,?3,?4,?5)",
            params![message.id,message.conversation_id,message.role,message.content,message.created_at]
        ).map_err(|e| e.to_string())?;
        if role == "user" {
            let existing_title: String = tx.query_row(
                "SELECT title FROM conversations WHERE id=?1", [conversation_id], |r| r.get(0)
            ).map_err(|e| e.to_string())?;
            if existing_title == "New conversation" {
                let short_title: String = content.trim().chars().take(54).collect();
                tx.execute("UPDATE conversations SET title=?1 WHERE id=?2", params![short_title,conversation_id])
                    .map_err(|e| e.to_string())?;
            }
        }
        tx.execute(
            "UPDATE conversations SET updated_at=?1 WHERE id=?2",
            params![message.created_at,conversation_id]
        ).map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(message)
    }

    pub fn append_user(&self, conversation_id: &str, content: &str) -> Result<Message, String> {
        self.append(conversation_id, "user", content)
    }
    pub fn append_assistant(&self, conversation_id: &str, content: &str) -> Result<Message, String> {
        self.append(conversation_id, "assistant", content)
    }

    pub fn history_for_model(&self, conversation_id: &str, model_key: &str) -> Result<Vec<Message>, String> {
        let conn = self.conn.lock().map_err(|_| "Database lock error")?;
        let pinned: Option<String> = conn.query_row(
            "SELECT model_key FROM conversations WHERE id=?1", [conversation_id], |r| r.get(0)
        ).optional().map_err(|e| e.to_string())?;
        match pinned {
            None => return Err("Conversation not found.".into()),
            Some(ref key) if key != model_key => return Err("Conversation uses a different model. Start a new chat to switch models.".into()),
            _ => {}
        }
        drop(conn);
        let messages = self.messages(conversation_id)?;
        if messages.last().map(|message| message.role.as_str()) != Some("user") {
            return Err("A user message is required to generate a reply.".into());
        }
        Ok(messages)
    }

    pub fn delete(&self, conversation_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|_| "Database lock error")?;
        conn.execute("DELETE FROM conversations WHERE id=?1", [conversation_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn messages_persist_and_cascade_on_delete() {
        let dir = std::env::temp_dir().join(format!("novasonic-test-{}",Uuid::new_v4()));
        let store = Store::open(dir.clone()).unwrap();
        let chat = store.create("ollama::test").unwrap();
        store.append_user(&chat.id, "Hello from local storage").unwrap();
        assert_eq!(store.messages(&chat.id).unwrap().len(), 1);
        assert!(store.history_for_model(&chat.id, "ollama::other").is_err());
        store.delete(&chat.id).unwrap();
        assert_eq!(store.conversations().unwrap().len(), 0);
        assert!(store.messages(&chat.id).is_err());
        drop(store);
        let _ = std::fs::remove_dir_all(dir);
    }
}
