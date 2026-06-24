import type { AgentEvent } from "@/types";

// 把扁平的 AgentEvent 流折叠成「轮次化」的对话项，供 UI 渲染。

export type TextPart = { type: "text"; text: string };
export type ReasoningPart = { type: "reasoning"; text: string };
export type ToolPart = {
  type: "tool";
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
  isError?: boolean;
  state: "running" | "done";
};
export type AssistantPart = TextPart | ReasoningPart | ToolPart;

export type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; parts: AssistantPart[]; done: boolean }
  | { id: string; role: "system"; level: "info" | "error" | "debug"; text: string };

let counter = 0;
const nextId = () => `it-${Date.now()}-${counter++}`;

/** 关闭当前活跃的 assistant 轮（标记 done），用于用户发新消息或一轮结束时。 */
function closeActive(items: ChatItem[]): ChatItem[] {
  return items.map((it) =>
    it.role === "assistant" && !it.done ? { ...it, done: true } : it,
  );
}

/** 取最后一个未完成的 assistant 项的下标，没有则返回 -1。 */
function activeIndex(items: ChatItem[]): number {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.role === "assistant" && !it.done) return i;
    if (it.role === "user") return -1; // 用户消息之后还没有 assistant
  }
  return -1;
}

/** 确保存在一个活跃 assistant 项，返回 [新数组, 该项下标]。 */
function ensureAssistant(items: ChatItem[]): [ChatItem[], number] {
  const idx = activeIndex(items);
  if (idx >= 0) return [items, idx];
  const next = [
    ...items,
    { id: nextId(), role: "assistant" as const, parts: [], done: false },
  ];
  return [next, next.length - 1];
}

/** 把用户消息追加进对话（关闭上一轮 assistant）。 */
export function appendUser(items: ChatItem[], text: string): ChatItem[] {
  return [...closeActive(items), { id: nextId(), role: "user", text }];
}

/** 把单个事件应用到对话项数组上，返回新数组。 */
export function applyEvent(items: ChatItem[], ev: AgentEvent): ChatItem[] {
  switch (ev.kind) {
    case "sessionStarted":
      return [
        ...items,
        { id: nextId(), role: "system", level: "info", text: "会话已建立" },
      ];

    case "textDelta": {
      const [next, idx] = ensureAssistant(items);
      const item = next[idx];
      if (item.role !== "assistant") return next;
      const parts = [...item.parts];
      const last = parts[parts.length - 1];
      if (last && last.type === "text") {
        parts[parts.length - 1] = { type: "text", text: last.text + ev.text };
      } else {
        parts.push({ type: "text", text: ev.text });
      }
      next[idx] = { ...item, parts };
      return [...next];
    }

    case "reasoningDelta": {
      const [next, idx] = ensureAssistant(items);
      const item = next[idx];
      if (item.role !== "assistant") return next;
      const parts = [...item.parts];
      const last = parts[parts.length - 1];
      if (last && last.type === "reasoning") {
        parts[parts.length - 1] = {
          type: "reasoning",
          text: last.text + ev.text,
        };
      } else {
        parts.push({ type: "reasoning", text: ev.text });
      }
      next[idx] = { ...item, parts };
      return [...next];
    }

    case "toolCall": {
      const [next, idx] = ensureAssistant(items);
      const item = next[idx];
      if (item.role !== "assistant") return next;
      const parts: AssistantPart[] = [
        ...item.parts,
        {
          type: "tool",
          id: ev.id,
          name: ev.name,
          input: ev.input,
          state: "running",
        },
      ];
      next[idx] = { ...item, parts };
      return [...next];
    }

    case "toolResult": {
      const idx = activeIndex(items);
      if (idx < 0) return items;
      const item = items[idx];
      if (item.role !== "assistant") return items;
      const parts = item.parts.map((p) =>
        p.type === "tool" && p.id === ev.id
          ? { ...p, output: ev.output, isError: ev.isError, state: "done" as const }
          : p,
      );
      const next = [...items];
      next[idx] = { ...item, parts };
      return next;
    }

    case "turnDone":
      return closeActive(items);

    case "error":
      return [
        ...items,
        { id: nextId(), role: "system", level: "error", text: ev.message },
      ];

    case "permissionRequest":
      return [
        ...items,
        {
          id: nextId(),
          role: "system",
          level: "info",
          text: `需要批准：${ev.action}`,
        },
      ];

    case "raw":
      return [
        ...items,
        {
          id: nextId(),
          role: "system",
          level: "debug",
          text: JSON.stringify(ev.value),
        },
      ];
  }
}
