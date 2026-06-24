import {
  Bot,
  BrainCircuit,
  Bug,
  Cpu,
  History,
  LayoutGrid,
  Moon,
  MessageSquarePlus,
  PanelLeft,
  Plus,
  RotateCw,
  Settings,
  Sun,
  Workflow,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "@/lib/utils";

export type Mode = "agent" | "model";

const REPO_URL = "https://github.com/lss/OneMind";

/** GitHub 标记（lucide 已移除品牌图标，用内联 SVG）。 */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.52 11.52 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
import type { Conversation } from "@/hooks/useAgentSession";

/** 对话标题：优先取第一条用户消息，否则用 agent 名。 */
function conversationTitle(c: Conversation): string {
  const firstUser = c.items.find((it) => it.role === "user");
  if (firstUser && firstUser.role === "user") return firstUser.text;
  return c.agentName;
}

function NavItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** 左侧栏（可折叠）：品牌 + 导航菜单 + 最近会话 + 底部状态/工具。 */
export function WorkspaceSidebar({
  collapsed,
  width,
  animate,
  onToggle,
  connected,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onAddAgent,
  onOpenBoard,
  mode,
  onModeChange,
  isDark,
  onQuickToggleTheme,
  onOpenSettings,
}: {
  collapsed: boolean;
  width: number;
  animate: boolean;
  onToggle: () => void;
  connected: boolean;
  conversations: Conversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onAddAgent: () => void;
  onOpenBoard: () => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  isDark: boolean;
  onQuickToggleTheme: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <aside
      style={{ width: collapsed ? 60 : width }}
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border/30 bg-sidebar text-sidebar-foreground",
        animate && "transition-[width] duration-200 ease-out",
      )}
    >
      {/* 品牌 + 折叠键 */}
      <div
        className={cn(
          "flex h-14 items-center gap-2 px-3",
          collapsed && "justify-center px-0",
        )}
      >
        {!collapsed && (
          <div className="flex flex-1 items-center gap-2">
            <BrainCircuit className="size-5 rotate-90 text-violet-400" />
            <span className="font-serif text-base font-semibold tracking-tight text-violet-400">
              OneMind
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "展开侧栏" : "折叠侧栏"}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      {/* 模式切换：智能体 / 大模型 */}
      {!collapsed && (
        <div className="px-3 pb-1 pt-0.5">
          <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => onModeChange("agent")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                mode === "agent"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bot className="size-3.5" />
              智能体
            </button>
            <button
              type="button"
              onClick={() => onModeChange("model")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                mode === "model"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Cpu className="size-3.5" />
              大模型
            </button>
          </div>
        </div>
      )}

      {/* 导航菜单 */}
      <nav className="flex flex-col gap-0.5 px-3 pt-1">
        {mode === "agent" ? (
          <NavItem
            icon={<Plus className="size-4" />}
            label="添加智能体"
            collapsed={collapsed}
            onClick={onAddAgent}
          />
        ) : (
          <NavItem
            icon={<MessageSquarePlus className="size-4" />}
            label="新建对话"
            collapsed={collapsed}
            onClick={onNewConversation}
          />
        )}
        {mode !== "agent" && (
          <NavItem
            icon={<History className="size-4" />}
            label="会话历史"
            collapsed={collapsed}
          />
        )}
        <NavItem
          icon={<LayoutGrid className="size-4" />}
          label="看板"
          collapsed={collapsed}
          onClick={onOpenBoard}
        />
        {mode === "agent" && (
          <NavItem
            icon={<Workflow className="size-4" />}
            label="工作流"
            collapsed={collapsed}
          />
        )}
      </nav>

      {/* 最近会话（智能体模式下不显示） */}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3">
        {mode !== "agent" && !collapsed && conversations.length > 0 && (
          <div className="mb-1 px-1 text-[11px] font-medium text-muted-foreground/70">
            最近
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {mode !== "agent" &&
            !collapsed &&
            conversations.map((c) => {
              const title = conversationTitle(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  title={title}
                  onClick={() => onSelectConversation(c.id)}
                  className={cn(
                    "w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-sidebar-accent/60",
                    c.id === activeId
                      ? "bg-sidebar-accent/70 text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {title}
                </button>
              );
            })}
        </div>
      </div>

      {/* 底部：连接状态 + 工具图标 */}
      <div className="border-t border-sidebar-border/60 p-3">
        {mode !== "agent" && (
          <div
            className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground",
              !collapsed && "px-1",
              collapsed && "justify-center",
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center">
              <span
                className={cn(
                  "size-2 rounded-full",
                  connected ? "bg-green-500" : "bg-rose-500",
                )}
              />
            </span>
            {!collapsed && (
              <>
                <span>{connected ? "运行中" : "未连接"}</span>
                <span className="ml-auto">
                  <IconButton title="新对话" onClick={onNewConversation}>
                    <RotateCw className="size-3.5" />
                  </IconButton>
                </span>
              </>
            )}
          </div>
        )}

        {!collapsed && (
          <div className="mt-3 flex w-60 max-w-full items-center justify-between px-1">
            <IconButton title="切换主题" onClick={onQuickToggleTheme}>
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </IconButton>
            <IconButton title="设置" onClick={onOpenSettings}>
              <Settings className="size-4" />
            </IconButton>
            <IconButton
              title="GitHub"
              onClick={() => openUrl(REPO_URL).catch(() => {})}
            >
              <GithubIcon className="size-4" />
            </IconButton>
            <IconButton
              title="反馈 / Bug 报告"
              onClick={() => openUrl(`${REPO_URL}/issues`).catch(() => {})}
            >
              <Bug className="size-4" />
            </IconButton>
          </div>
        )}
      </div>
    </aside>
  );
}
