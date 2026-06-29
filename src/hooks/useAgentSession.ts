import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AgentEvent, AgentInfo } from "@/types";
import { appendUser, applyEvent, type ChatItem } from "@/lib/chat";

/** 一段对话：各自保存消息，可点击在侧栏间切换还原。 */
export interface Conversation {
  id: string; // 前端本地会话 id
  agentId: string;
  agentName: string;
  startedAt: number;
  backendId?: string; // Tauri 后端会话 id（子进程），首次发送时懒创建
  alive: boolean; // 后端进程是否在运行
  items: ChatItem[];
}

let cc = 0;
const newConvId = () => `c-${Date.now()}-${cc++}`;
const EVENT_FLUSH_MS = 50;

export function useAgentSession() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [connecting, setConnecting] = useState(false);

  // 给异步流程做最新状态查询
  const convRef = useRef<Conversation[]>([]);
  useEffect(() => {
    convRef.current = conversations;
  }, [conversations]);

  const unlistens = useRef<Record<string, UnlistenFn>>({});
  const pendingEvents = useRef<Record<string, AgentEvent[]>>({});
  const eventFlushTimer = useRef<number | null>(null);

  // 加载可用 agent
  useEffect(() => {
    invoke<AgentInfo[]>("list_agents")
      .then((list) => {
        setAgents(list);
        if (list.length > 0) setSelected((s) => s || list[0].id);
      })
      .catch((e) => console.error("list_agents 失败", e));
  }, []);

  const flushEvents = useCallback(() => {
    eventFlushTimer.current = null;
    const batches = pendingEvents.current;
    if (Object.keys(batches).length === 0) return;
    pendingEvents.current = {};

    setConversations((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const events = batches[c.id];
        if (!events?.length) return c;
        const items = events.reduce<ChatItem[]>(
          (acc, event) => applyEvent(acc, event),
          c.items,
        );
        if (items === c.items) return c;
        changed = true;
        return { ...c, items };
      });
      return changed ? next : prev;
    });
  }, []);

  const flushEventsNow = useCallback(() => {
    if (eventFlushTimer.current !== null) {
      window.clearTimeout(eventFlushTimer.current);
    }
    flushEvents();
  }, [flushEvents]);

  const scheduleEventFlush = useCallback(() => {
    if (eventFlushTimer.current !== null) return;
    eventFlushTimer.current = window.setTimeout(flushEvents, EVENT_FLUSH_MS);
  }, [flushEvents]);

  const enqueueEvent = useCallback(
    (convId: string, event: AgentEvent) => {
      const batch = pendingEvents.current[convId] ?? [];
      batch.push(event);
      pendingEvents.current[convId] = batch;
      scheduleEventFlush();
    },
    [scheduleEventFlush],
  );

  // 卸载时解除所有事件监听
  useEffect(
    () => () => {
      Object.values(unlistens.current).forEach((f) => f());
      if (eventFlushTimer.current !== null) {
        window.clearTimeout(eventFlushTimer.current);
      }
      pendingEvents.current = {};
    },
    [],
  );

  const patchItems = useCallback(
    (convId: string, updater: (items: ChatItem[]) => ChatItem[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, items: updater(c.items) } : c,
        ),
      );
    },
    [],
  );

  /** 懒启动后端进程并挂上事件监听（事件按 convId 路由到对应对话）。 */
  const ensureBackend = useCallback(
    async (convId: string, agentId: string): Promise<string | null> => {
      const existing = convRef.current.find((c) => c.id === convId);
      if (existing?.backendId && existing.alive) return existing.backendId;
      setConnecting(true);
      try {
        const backendId = await invoke<string>("start_session", { agentId });
        const un = await listen<AgentEvent>(
          `agent://event/${backendId}`,
          (e) => enqueueEvent(convId, e.payload),
        );
        unlistens.current[backendId] = un;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, backendId, alive: true } : c,
          ),
        );
        return backendId;
      } catch (e) {
        patchItems(convId, (items) => [
          ...items,
          {
            id: `err-${Date.now()}`,
            role: "system",
            level: "error",
            text: `启动失败：${e}`,
          },
        ]);
        return null;
      } finally {
        setConnecting(false);
      }
    },
    [enqueueEvent, patchItems],
  );

  const createConversation = useCallback(
    (agentId: string): Conversation => {
      const agentName = agents.find((a) => a.id === agentId)?.name ?? agentId;
      const conv: Conversation = {
        id: newConvId(),
        agentId,
        agentName,
        startedAt: Date.now(),
        alive: false,
        items: [],
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      return conv;
    },
    [agents],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      let conv = convRef.current.find((c) => c.id === activeId);
      if (!conv) conv = createConversation(selected);
      const convId = conv.id;
      const agentId = conv.agentId;
      flushEventsNow();
      patchItems(convId, (items) => appendUser(items, trimmed));
      const backendId = await ensureBackend(convId, agentId);
      if (!backendId) return;
      await invoke("send_message", { sessionId: backendId, text: trimmed }).catch(
        (e) => console.error("send_message 失败", e),
      );
    },
    [activeId, selected, createConversation, ensureBackend, flushEventsNow, patchItems],
  );

  /** 新建对话（当前已是空对话则不重复创建）。 */
  const newConversation = useCallback(() => {
    const cur = convRef.current.find((c) => c.id === activeId);
    if (cur && cur.items.length === 0) return;
    createConversation(selected);
  }, [activeId, selected, createConversation]);

  /** 点击历史条目：切换显示该对话。 */
  const selectConversation = useCallback((id: string) => setActiveId(id), []);

  /** 切换 agent：当前对话有内容则开新对话，空对话则就地改 agent。 */
  const selectAgent = useCallback(
    (id: string) => {
      if (id === selected) return;
      setSelected(id);
      const cur = convRef.current.find((c) => c.id === activeId);
      if (!cur) return; // 欢迎页，发送时再按新 agent 建对话
      if (cur.items.length > 0) {
        createConversation(id);
      } else {
        const agentName = agents.find((a) => a.id === id)?.name ?? id;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, agentId: id, agentName } : c,
          ),
        );
      }
    },
    [selected, activeId, agents, createConversation],
  );

  const activeConv = conversations.find((c) => c.id === activeId);
  const items = activeConv?.items ?? [];
  const connected = !!activeConv?.alive;
  const currentAgent = agents.find((a) => a.id === selected);

  return {
    agents,
    selected,
    selectAgent,
    conversations,
    activeId,
    items,
    connected,
    connecting,
    send,
    newConversation,
    selectConversation,
    currentAgent,
  };
}
