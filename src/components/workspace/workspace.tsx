import { useEffect, useRef, useState } from "react";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useSettings } from "@/hooks/useSettings";
import { WorkspaceSidebar, type Mode } from "./workspace-sidebar";
import { Welcome } from "./welcome";
import { Settings } from "./settings";
import { AddAgentView } from "./add-agent-view";
import { BoardView } from "./board-view";
import { Conversation } from "@/components/ai-elements/conversation";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 460;

/** 工作台容器：可折叠/可拖拽侧栏 + （空状态欢迎页 / 对话区 + 底部输入）+ 设置面板。 */
export function Workspace() {
  const {
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
  } = useAgentSession();

  const settings = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("agent");

  // 智能体模式：输入框不带 ⚡ 选择器；大模型模式：带。
  const showSelector = mode === "model";

  // 右侧主区视图：对话 / 添加智能体 / 工作区看板。
  const [view, setView] = useState<"chat" | "addAgent" | "board">("chat");

  // 已添加的智能体。
  const [addedAgentIds, setAddedAgentIds] = useState<string[]>([]);
  const addedAgents = agents.filter((a) => addedAgentIds.includes(a.id));
  const toggleAgent = (id: string) =>
    setAddedAgentIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  // 侧栏宽度（可拖拽）
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX));
      setSidebarWidth(w);
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startResize = () => {
    resizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const empty = items.length === 0;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <WorkspaceSidebar
        collapsed={collapsed}
        width={sidebarWidth}
        animate={!isResizing}
        onToggle={() => setCollapsed((c) => !c)}
        connected={connected}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={selectConversation}
        onNewConversation={newConversation}
        onAddAgent={() => setView("addAgent")}
        onOpenBoard={() => setView("board")}
        mode={mode}
        onModeChange={setMode}
        isDark={settings.isDark}
        onQuickToggleTheme={() =>
          settings.setTheme(settings.isDark ? "light" : "dark")
        }
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* 拖拽手柄（折叠时隐藏）。-mx 让命中区跨在侧栏边线上，不占布局宽度。 */}
      {!collapsed && (
        <div
          onMouseDown={startResize}
          className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize"
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors",
              isResizing
                ? "bg-primary/60"
                : "bg-transparent group-hover:bg-primary/40",
            )}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {view === "addAgent" ? (
          <AddAgentView
            agents={agents}
            addedIds={addedAgentIds}
            onToggle={toggleAgent}
            onClose={() => setView("chat")}
            selected={selected}
            connected={connected}
          />
        ) : view === "board" ? (
          <BoardView onClose={() => setView("chat")} addedAgents={addedAgents} />
        ) : empty ? (
          <Welcome
            agents={agents}
            selected={selected}
            onSelectAgent={selectAgent}
            onSend={send}
            busy={connecting}
            showSelector={showSelector}
          />
        ) : (
          <>
            <Conversation items={items} />
            <div className="px-4 pb-4">
              <div className="mx-auto max-w-3xl">
                <PromptInput
                  agents={agents}
                  selected={selected}
                  onSelectAgent={selectAgent}
                  onSend={send}
                  busy={connecting}
                  showSelector={showSelector}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <Settings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={settings.theme}
        setTheme={settings.setTheme}
        fontScale={settings.fontScale}
        setFontScale={settings.setFontScale}
        workspace={settings.workspace}
        setWorkspace={settings.setWorkspace}
        frosted={settings.frosted}
        setFrosted={settings.setFrosted}
        opacity={settings.opacity}
        setOpacity={settings.setOpacity}
      />
    </div>
  );
}
