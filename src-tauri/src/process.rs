use std::process::Stdio;

use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};

use crate::adapters;
use crate::events::AgentEvent;
use crate::registry::AgentManifest;

/// 一个运行中的 agent 子进程。
pub struct RunningAgent {
    pub child: Child,
    pub stdin: Option<ChildStdin>,
    pub protocol: String,
}

/// 每个会话独立的事件通道名。前端 listen 同名 channel。
pub fn event_name(session_id: &str) -> String {
    format!("agent://event/{}", session_id)
}

/// 启动 agent 子进程，并把它的 stdout/stderr 作为 AgentEvent 流式 emit 给前端。
pub fn spawn_agent(
    app: AppHandle,
    session_id: String,
    manifest: &AgentManifest,
    cwd: Option<String>,
) -> Result<RunningAgent, String> {
    let mut cmd = Command::new(&manifest.command);
    cmd.args(&manifest.args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("启动 `{}` 失败: {e}", manifest.command))?;

    let stdout = child.stdout.take().ok_or("无法获取子进程 stdout")?;
    let stderr = child.stderr.take().ok_or("无法获取子进程 stderr")?;
    let stdin = child.stdin.take();

    // stdout → 解析为结构化事件
    let protocol = manifest.info.protocol.clone();
    let app_out = app.clone();
    let sid_out = session_id.clone();
    tokio::spawn(async move {
        let parser = adapters::parser_for(&protocol);
        let channel = event_name(&sid_out);
        let _ = app_out.emit(
            &channel,
            AgentEvent::SessionStarted {
                id: sid_out.clone(),
            },
        );
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            for event in parser.parse_line(&line) {
                let _ = app_out.emit(&channel, event);
            }
        }
        // stdout 关闭 = 进程结束（对持续会话的 agent，TurnDone 应由解析器在每轮产出）
        let _ = app_out.emit(&channel, AgentEvent::TurnDone { usage: None });
    });

    // stderr → 非致命错误（诊断用）
    let app_err = app.clone();
    let sid_err = session_id.clone();
    tokio::spawn(async move {
        let channel = event_name(&sid_err);
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            let _ = app_err.emit(
                &channel,
                AgentEvent::Error {
                    message: line,
                    fatal: false,
                },
            );
        }
    });

    Ok(RunningAgent {
        child,
        stdin,
        protocol: manifest.info.protocol.clone(),
    })
}

/// 向运行中的 agent 写入一轮输入。
pub async fn write_input(agent: &mut RunningAgent, text: &str) -> Result<(), String> {
    let encoded = adapters::encoder_for(&agent.protocol).encode(text);
    match agent.stdin.as_mut() {
        Some(stdin) => {
            stdin
                .write_all(encoded.as_bytes())
                .await
                .map_err(|e| e.to_string())?;
            stdin.flush().await.map_err(|e| e.to_string())?;
            Ok(())
        }
        None => Err("agent 的 stdin 已关闭".into()),
    }
}
