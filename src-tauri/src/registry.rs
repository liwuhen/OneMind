use serde::Serialize;

/// 暴露给前端的 agent 元信息。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    /// "structured"（结构化 / headless JSON）| "terminal"（PTY 兜底，暂未实现）
    pub kind: String,
    /// 选用哪个内置解析器：claude-stream-json | generic-ndjson | plain-text
    pub protocol: String,
}

/// 一个 agent 的完整定义（M1 先用内置 Rust 定义；后续可改为加载 TOML manifest）。
#[derive(Debug, Clone)]
pub struct AgentManifest {
    pub info: AgentInfo,
    pub command: String,
    pub args: Vec<String>,
}

/// 内置 agent 列表。
pub fn builtin_agents() -> Vec<AgentManifest> {
    vec![
        // 演示用：把发给它的每一行原样回显。无需安装任何外部工具，
        // 用于端到端验证「输入 → 子进程 → stdout → 解析 → 事件 → 前端」管线。
        AgentManifest {
            info: AgentInfo {
                id: "demo-echo".into(),
                name: "Demo Echo".into(),
                description: "回显输入，用于验证管线（无需外部依赖）".into(),
                kind: "structured".into(),
                protocol: "plain-text".into(),
            },
            command: "bash".into(),
            args: vec![
                "-c".into(),
                "while IFS= read -r line; do printf '%s\\n' \"$line\"; done".into(),
            ],
        },
        // Claude Code 的 headless stream-json 模式。
        AgentManifest {
            info: AgentInfo {
                id: "claude-code".into(),
                name: "Claude Code".into(),
                description: "Anthropic 官方编码 agent（stream-json 模式）".into(),
                kind: "structured".into(),
                protocol: "claude-stream-json".into(),
            },
            command: "claude".into(),
            args: vec![
                "-p".into(),
                "--output-format=stream-json".into(),
                "--input-format=stream-json".into(),
                "--verbose".into(),
            ],
        },
    ]
}

/// 按 id 查找 agent 定义。
pub fn find(id: &str) -> Option<AgentManifest> {
    builtin_agents().into_iter().find(|m| m.info.id == id)
}
