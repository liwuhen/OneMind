import { useState } from "react";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useSettings } from "@/hooks/useSettings";
import { WorkspaceSidebar, type Mode } from "./workspace-sidebar";
import { Welcome } from "./welcome";
import { Settings } from "./settings";
import { AddAgentView } from "./add-agent-view";
import { BoardView } from "./board-view";
import { Conversation } from "@/components/ai-elements/conversation";
import { PromptInput } from "@/components/ai-elements/prompt-input";

const SIDEBAR_WIDTH = 220;

/** 工作台容器：固定宽度侧栏 + （空状态欢迎页 / 对话区 + 底部输入）+ 设置面板。 */
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

  const empty = items.length === 0;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <WorkspaceSidebar
        collapsed={collapsed}
        width={SIDEBAR_WIDTH}
        animate
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
