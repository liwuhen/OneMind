use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::process;
use crate::registry::{self, AgentInfo};
use crate::session::AppState;

/// 列出所有可用 agent。
#[tauri::command]
pub fn list_agents() -> Vec<AgentInfo> {
    registry::builtin_agents()
        .into_iter()
        .map(|m| m.info)
        .collect()
}

/// 启动一个会话（spawn 子进程），返回 session_id。
/// 前端随后 listen `agent://event/{session_id}` 接收事件流。
#[tauri::command]
pub async fn start_session(
    app: AppHandle,
    state: State<'_, AppState>,
    agent_id: String,
    workspace: Option<String>,
) -> Result<String, String> {
    let manifest =
        registry::find(&agent_id).ok_or_else(|| format!("未知 agent: {agent_id}"))?;
    let session_id = Uuid::new_v4().to_string();
    let running = process::spawn_agent(app, session_id.clone(), &manifest, workspace)?;
    state
        .sessions
        .lock()
        .await
        .insert(session_id.clone(), running);
    Ok(session_id)
}

/// 向会话发送一轮输入。
#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    session_id: String,
    text: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    let agent = sessions
        .get_mut(&session_id)
        .ok_or("未知 session")?;
    process::write_input(agent, &text).await
}

/// 结束会话并杀掉子进程。
#[tauri::command]
pub async fn stop_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    if let Some(mut agent) = state.sessions.lock().await.remove(&session_id) {
        let _ = agent.child.start_kill();
    }
    Ok(())
}
