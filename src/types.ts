// 与 Rust 端 events.rs 的 AgentEvent 对应（serde tag = "kind", camelCase）。
export type AgentEvent =
  | { kind: "sessionStarted"; id: string }
  | { kind: "textDelta"; text: string }
  | { kind: "reasoningDelta"; text: string }
  | { kind: "toolCall"; id: string; name: string; input: unknown }
  | { kind: "toolResult"; id: string; output: unknown; isError: boolean }
  | { kind: "permissionRequest"; id: string; action: string; detail: unknown }
  | { kind: "turnDone"; usage: unknown | null }
  | { kind: "error"; message: string; fatal: boolean }
  | { kind: "raw"; value: unknown };

// 与 Rust 端 registry.rs 的 AgentInfo 对应。
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  kind: string;
  protocol: string;
}
