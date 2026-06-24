use crate::adapters::{InputEncoder, LineParser};
use crate::events::AgentEvent;

/// 解析 Claude Code 的 stream-json 输出（每行一个 JSON 对象）。
///
/// 形态（best-effort，最终以 Claude CLI 实际输出为准）：
///   {"type":"system", ...}
///   {"type":"assistant","message":{"content":[{"type":"text","text":"..."},
///                                              {"type":"tool_use","id":..,"name":..,"input":{}}]}}
///   {"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":..,
///                                         "content":..,"is_error":..}]}}
///   {"type":"result","usage":{...}}
pub struct ClaudeParser;

impl LineParser for ClaudeParser {
    fn parse_line(&self, line: &str) -> Vec<AgentEvent> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return vec![];
        }
        let v: serde_json::Value = match serde_json::from_str(trimmed) {
            Ok(v) => v,
            Err(_) => {
                return vec![AgentEvent::Raw {
                    value: serde_json::json!({ "unparsed": line }),
                }]
            }
        };

        let mut out = Vec::new();
        match v.get("type").and_then(|t| t.as_str()) {
            Some("assistant") => {
                if let Some(content) = v.pointer("/message/content").and_then(|c| c.as_array()) {
                    for block in content {
                        match block.get("type").and_then(|t| t.as_str()) {
                            Some("text") => {
                                if let Some(t) = block.get("text").and_then(|x| x.as_str()) {
                                    out.push(AgentEvent::TextDelta {
                                        text: t.to_string(),
                                    });
                                }
                            }
                            Some("thinking") => {
                                if let Some(t) = block.get("thinking").and_then(|x| x.as_str()) {
                                    out.push(AgentEvent::ReasoningDelta {
                                        text: t.to_string(),
                                    });
                                }
                            }
                            Some("tool_use") => {
                                out.push(AgentEvent::ToolCall {
                                    id: str_field(block, "id"),
                                    name: str_field(block, "name"),
                                    input: block
                                        .get("input")
                                        .cloned()
                                        .unwrap_or(serde_json::Value::Null),
                                });
                            }
                            _ => {}
                        }
                    }
                }
            }
            Some("user") => {
                if let Some(content) = v.pointer("/message/content").and_then(|c| c.as_array()) {
                    for block in content {
                        if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                            out.push(AgentEvent::ToolResult {
                                id: str_field(block, "tool_use_id"),
                                output: block
                                    .get("content")
                                    .cloned()
                                    .unwrap_or(serde_json::Value::Null),
                                is_error: block
                                    .get("is_error")
                                    .and_then(|x| x.as_bool())
                                    .unwrap_or(false),
                            });
                        }
                    }
                }
            }
            Some("result") => {
                out.push(AgentEvent::TurnDone {
                    usage: v.get("usage").cloned(),
                });
            }
            // system/init 等保留为原始事件，便于调试
            _ => out.push(AgentEvent::Raw { value: v }),
        }
        out
    }
}

fn str_field(v: &serde_json::Value, key: &str) -> String {
    v.get(key)
        .and_then(|x| x.as_str())
        .unwrap_or_default()
        .to_string()
}

/// 把用户输入编码成 stream-json 的一条 user 消息。
pub struct ClaudeEncoder;
impl InputEncoder for ClaudeEncoder {
    fn encode(&self, text: &str) -> String {
        let msg = serde_json::json!({
            "type": "user",
            "message": {
                "role": "user",
                "content": [ { "type": "text", "text": text } ]
            }
        });
        format!("{}\n", msg)
    }
}
