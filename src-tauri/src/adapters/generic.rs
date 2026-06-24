use crate::adapters::{InputEncoder, LineParser};
use crate::events::AgentEvent;

/// 纯文本：每一行就是一段助手文本。
pub struct PlainTextParser;
impl LineParser for PlainTextParser {
    fn parse_line(&self, line: &str) -> Vec<AgentEvent> {
        if line.is_empty() {
            return vec![];
        }
        vec![AgentEvent::TextDelta {
            text: format!("{}\n", line),
        }]
    }
}

/// 通用 NDJSON：尝试解析 JSON，命中常见文本字段则当作文本，否则原始透传。
pub struct NdjsonParser;
impl LineParser for NdjsonParser {
    fn parse_line(&self, line: &str) -> Vec<AgentEvent> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return vec![];
        }
        match serde_json::from_str::<serde_json::Value>(trimmed) {
            Ok(v) => {
                let text = v
                    .get("text")
                    .and_then(|x| x.as_str())
                    .or_else(|| v.get("delta").and_then(|x| x.as_str()))
                    .or_else(|| v.get("content").and_then(|x| x.as_str()));
                match text {
                    Some(t) => vec![AgentEvent::TextDelta {
                        text: t.to_string(),
                    }],
                    None => vec![AgentEvent::Raw { value: v }],
                }
            }
            // 不是合法 JSON 就按纯文本处理
            Err(_) => vec![AgentEvent::TextDelta {
                text: format!("{}\n", line),
            }],
        }
    }
}

/// 纯文本输入：原样加换行写入 stdin。
pub struct PlainTextEncoder;
impl InputEncoder for PlainTextEncoder {
    fn encode(&self, text: &str) -> String {
        format!("{}\n", text)
    }
}
