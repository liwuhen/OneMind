import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bot,
  ClipboardList,
  FileText,
  Gauge,
  LayoutGrid,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AgentInfo } from "@/types";
import { Office3D } from "./office-3d";

type Card = { id: string; title: string; agent: string };
type Column = { id: string; title: string; accent: string; cards: Card[] };

const TABS = [
  { id: "agent", label: "智能体", icon: Bot },
  { id: "task", label: "任务", icon: ClipboardList },
  { id: "monitor", label: "运行监控", icon: Activity },
  { id: "status", label: "运行状态", icon: Gauge },
  { id: "report", label: "完成报告", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

// 占位示例数据（接真实任务后替换）。
const COLUMNS: Column[] = [
  {
    id: "todo",
    title: "待办",
    accent: "bg-muted-foreground/40",
    cards: [
      { id: "c1", title: "梳理需求文档", agent: "Claude Code" },
      { id: "c2", title: "设计数据库结构", agent: "Codex" },
    ],
  },
  {
    id: "doing",
    title: "进行中",
    accent: "bg-violet-500",
    cards: [
      { id: "c3", title: "实现登录接口", agent: "Claude Code" },
      { id: "c4", title: "编写单元测试", agent: "Claude Code" },
      { id: "c5", title: "重构状态管理", agent: "Codex" },
    ],
  },
  {
    id: "done",
    title: "已完成",
    accent: "bg-green-500",
    cards: [{ id: "c6", title: "搭建项目骨架", agent: "Claude Code" }],
  },
];

/** 右侧主区的「工作区」：顶部标签栏（智能体/任务/运行监控/运行状态/完成报告）+ 对应内容。 */
export function BoardView({
  onClose,
  addedAgents,
}: {
  onClose: () => void;
  addedAgents: AgentInfo[];
}) {
  const [tab, setTab] = useState<TabId>("agent");
  const [boardAgent, setBoardAgent] = useState<string>("");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-3.5">
        <button
          type="button"
          onClick={onClose}
          title="返回主页"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-sm">
          <LayoutGrid className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">工作区</h2>
          <p className="text-xs text-muted-foreground">
            {TABS.find((t) => t.id === tab)?.label}
          </p>
        </div>
      </div>

      {/* 标签栏（胶囊形按钮） */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border/40 px-4 py-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors",
                active ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 内容 */}
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "agent" ? (
          <AgentSelect
            addedAgents={addedAgents}
            value={boardAgent}
            onChange={setBoardAgent}
          />
        ) : tab === "task" ? (
          <KanbanBoard />
        ) : (
          <Placeholder label={TABS.find((t) => t.id === tab)!.label} />
        )}
      </div>
    </div>
  );
}

// 占位：按 agentId 推导该智能体当前进行中的任务（接真实运行时数据后替换）。
const TASK_POOL = [
  "分析项目结构",
  "生成单元测试",
  "运行构建校验",
  "重构状态管理",
  "修复登录缺陷",
  "编写接口文档",
  "优化查询性能",
];

function mockTasksForAgent(agentId: string): { id: string; title: string }[] {
  const seed = [...agentId].reduce((s, c) => s + c.charCodeAt(0), 0);
  const count = (seed % 4) + 1; // 1~4 个任务
  return Array.from({ length: count }, (_, i) => ({
    id: `${agentId}-t${i}`,
    title: TASK_POOL[(seed + i) % TASK_POOL.length],
  }));
}

/** 未选中时的脉冲动画提示点。 */
function PulseDot() {
  return (
    <span className="relative flex size-2.5 shrink-0">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-500 opacity-60" />
      <span className="relative inline-flex size-2.5 rounded-full bg-violet-500" />
    </span>
  );
}

function AgentSelect({
  addedAgents,
  value,
  onChange,
}: {
  addedAgents: AgentInfo[];
  value: string;
  onChange: (id: string) => void;
}) {
  const empty = addedAgents.length === 0;
  const agentName = addedAgents.find((a) => a.id === value)?.name ?? "";

  return (
    <div className="px-6 pt-4">
      <div className="flex items-center gap-3">
        <label className="shrink-0 text-sm font-medium">选择智能体</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            className={cn("h-11 w-64 gap-2", !value && "text-muted-foreground")}
          >
            {value ? (
              <Bot className="size-4 shrink-0 text-violet-500" />
            ) : (
              <PulseDot />
            )}
            <SelectValue placeholder="需要添加智能体" />
          </SelectTrigger>
          <SelectContent>
            {empty ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                暂无已添加的智能体
                <br />
                请先在「添加智能体」中添加
              </div>
            ) : (
              addedAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 智能体办公室：按任务数渲染坐着工作的工位 */}
      <AgentOfficeSection agentId={value} agentName={agentName} />
    </div>
  );
}

function AgentOfficeSection({
  agentId,
  agentName,
}: {
  agentId: string;
  agentName: string;
}) {
  if (!agentId) {
    return (
      <div className="mt-10 text-center text-sm text-muted-foreground">
        选择一个智能体，查看它的办公室
      </div>
    );
  }

  const tasks = mockTasksForAgent(agentId);

  return (
    <div className="mt-5">
      <Office3D agentName={agentName} tasks={tasks} />
    </div>
  );
}

function KanbanBoard() {
  return (
    <div className="p-5">
      <div className="flex h-full min-w-max gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex w-72 shrink-0 flex-col rounded-2xl border bg-muted/30"
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <span className={cn("size-2 rounded-full", col.accent)} />
              <span className="text-sm font-medium">{col.title}</span>
              <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {col.cards.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
              {col.cards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border bg-background p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {c.agent}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <Gauge className="mb-3 size-8 opacity-30" />
      <p className="text-sm">{label}（敬请期待）</p>
    </div>
  );
}
