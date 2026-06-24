use crate::events::AgentEvent;

pub mod claude;
pub mod generic;

/// 把 agent stdout 的一行解析成零个或多个统一事件。
pub trait LineParser: Send + Sync {
    fn parse_line(&self, line: &str) -> Vec<AgentEvent>;
}

/// 把用户输入编码成要写入 agent stdin 的内容。
pub trait InputEncoder: Send + Sync {
    fn encode(&self, text: &str) -> String;
}

/// 按 protocol 选择解析器。
pub fn parser_for(protocol: &str) -> Box<dyn LineParser> {
    match protocol {
        "claude-stream-json" => Box::new(claude::ClaudeParser),
        "generic-ndjson" => Box::new(generic::NdjsonParser),
        // plain-text 及未知协议都退化为纯文本逐行
        _ => Box::new(generic::PlainTextParser),
    }
}

/// 按 protocol 选择输入编码器。
pub fn encoder_for(protocol: &str) -> Box<dyn InputEncoder> {
    match protocol {
        "claude-stream-json" => Box::new(claude::ClaudeEncoder),
        _ => Box::new(generic::PlainTextEncoder),
    }
}
