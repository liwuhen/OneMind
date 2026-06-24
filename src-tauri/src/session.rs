use std::collections::HashMap;

use tokio::sync::Mutex;

use crate::process::RunningAgent;

/// 全局应用状态：当前所有活跃会话。
#[derive(Default)]
pub struct AppState {
    pub sessions: Mutex<HashMap<String, RunningAgent>>,
}
