use serde::Serialize;

/// 统一事件模型：每个 adapter 都把自家 agent 的输出归一成这些事件。
/// 前端只需理解这一种「语言」。
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AgentEvent {
    /// 会话已建立（子进程已启动）
    SessionStarted { id: String },
    /// 助手文本增量
    TextDelta { text: String },
    /// 思考过程增量
    ReasoningDelta { text: String },
    /// 工具调用
    ToolCall {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    /// 工具结果
    ToolResult {
        id: String,
        output: serde_json::Value,
        is_error: bool,
    },
    /// 需要用户批准的动作（改文件 / 执行命令等）
    /// 权限审批流程（M3）实现后构造，先纳入统一模型。
    #[allow(dead_code)]
    PermissionRequest {
        id: String,
        action: String,
        detail: serde_json::Value,
    },
    /// 一轮结束
    TurnDone { usage: Option<serde_json::Value> },
    /// 错误（fatal 表示会话不可继续）
    Error { message: String, fatal: bool },
    /// 原始透传（解析器未覆盖的字段，保证不丢信息，便于调试）
    Raw { value: serde_json::Value },
}
