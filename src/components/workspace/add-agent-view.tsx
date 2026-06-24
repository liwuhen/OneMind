import { useState } from "react";
import { ArrowLeft, Bot, Check, Loader2, MousePointerClick, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentInfo } from "@/types";

type AgentStatus = "offline" | "idle" | "running" | "error";

const STATUS_META: Record<
  AgentStatus,
  { label: string; dot: string; text: string; pulse?: boolean }
> = {
  offline: { label: "未连接", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
  idle: { label: "就绪", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  running: { label: "运行中", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", pulse: true },
  error: { label: "出错", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
};

function StatusDot({ status, className }: { status: AgentStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("relative flex size-2", className)}>
      {m.pulse && (
        <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", m.dot)} />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", m.dot)} />
    </span>
  );
}

/** 右侧主区的「添加智能体」界面：左栏智能体列表 + 右栏选中智能体的状态信息。 */
export function AddAgentView({
  agents,
  addedIds,
  onToggle,
  onClose,
  selected,
  connected,
}: {
  agents: AgentInfo[];
  addedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  selected: string;
  connected: boolean;
}) {
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  // 占位推导：选中且已连接→运行中；已添加→就绪；否则未连接（后续接事件流）。
  const statusOf = (id: string): AgentStatus => {
    if (id === selected && connected) return "running";
    if (addedIds.includes(id)) return "idle";
    return "offline";
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? agents.filter((a) => `${a.name} ${a.description ?? ""}`.toLowerCase().includes(q))
    : agents;

  const activeId = detailId ?? (selected || agents[0]?.id || null);
  const active = agents.find((a) => a.id === activeId) ?? null;

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
          <Bot className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">添加智能体</h2>
          <p className="text-xs text-muted-foreground">
            已添加 {addedIds.length} 个
          </p>
        </div>
      </div>

      {/* 两栏主体 */}
      <div className="flex min-h-0 flex-1">
        {/* 左栏：智能体列表 */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border/40">
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="搜索智能体…"
                className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-xs text-muted-foreground">
                {agents.length === 0 ? "暂无可用的智能体" : "无匹配结果"}
              </p>
            ) : (
              filtered.map((a) => {
                const added = addedIds.includes(a.id);
                const st = statusOf(a.id);
                const isActive = a.id === activeId;
                return (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailId(a.id)}
                    onKeyDown={(e) => e.key === "Enter" && setDetailId(a.id)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                      isActive ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-blue-500/10 text-violet-500">
                      <Bot className="size-4" />
                      <StatusDot
                        status={st}
                        className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      <span className={cn("block text-[11px]", STATUS_META[st].text)}>
                        {STATUS_META[st].label}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(a.id);
                      }}
                      title={added ? "移除" : "添加"}
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors",
                        added
                          ? "bg-primary text-primary-foreground"
                          : "border text-muted-foreground hover:border-primary/50 hover:text-primary",
                      )}
                    >
                      {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* 右栏：状态信息 */}
        <section className="min-h-0 flex-1 overflow-y-auto">
          {active ? (
            <AgentStatusPanel
              agent={active}
              status={statusOf(active.id)}
              added={addedIds.includes(active.id)}
              onToggle={() => onToggle(active.id)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MousePointerClick className="mb-3 size-8 opacity-40" />
              <p className="text-sm">从左侧选择一个智能体查看状态</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AgentStatusPanel({
  agent,
  status,
  added,
  onToggle,
}: {
  agent: AgentInfo;
  status: AgentStatus;
  added: boolean;
  onToggle: () => void;
}) {
  const m = STATUS_META[status];
  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      {/* 头部 */}
      <div className="flex items-start gap-4">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25">
          <Bot className="size-7" />
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-xl font-semibold tracking-tight">{agent.name}</h3>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium",
                m.text,
              )}
            >
              <StatusDot status={status} />
              {m.label}
            </span>
          </div>
          {agent.description && (
            <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
            added
              ? "border text-muted-foreground hover:bg-accent"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {added ? "移除" : "添加"}
        </button>
      </div>

      {/* 状态信息卡 */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        <InfoCard label="运行状态" value={m.label} />
        <InfoCard label="最近活跃" value="—" />
      </div>

      {/* 当前任务（支持多个并行） */}
      <RunningTasks running={status === "running"} />

      {/* Token 使用（柱状图） */}
      <TokenUsage />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

// 占位示例任务（接真实运行时数据后替换）。
const MOCK_TASKS = [
  { id: "t1", title: "分析项目结构", detail: "读取 12 个文件", elapsed: "00:12" },
  { id: "t2", title: "生成单元测试", detail: "src/utils/*.ts", elapsed: "00:34" },
  { id: "t3", title: "运行构建校验", detail: "npm run build", elapsed: "01:02" },
];

function RunningTasks({ running }: { running: boolean }) {
  const tasks = running ? MOCK_TASKS : [];
  return (
    <div className="mt-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">当前任务</div>
        {tasks.length > 0 && (
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
            {tasks.length} 个进行中
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">暂无进行中的任务</p>
      ) : (
        <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
            >
              <Loader2 className="size-4 shrink-0 animate-spin text-violet-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.detail}
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {t.elapsed}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 占位示例数据：最近 30 天每日 token 用量（接真实 usage 后替换）。
const DAILY_TOKENS = Array.from({ length: 30 }, (_, i) => {
  const wave = Math.abs(Math.sin(i * 1.3) + Math.cos(i * 0.7));
  return 120_000 + Math.round(wave * 180_000);
});

function formatTokens(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(2)}万`;
  return n.toLocaleString();
}

function TokenUsage() {
  const today = DAILY_TOKENS[DAILY_TOKENS.length - 1];
  const total = DAILY_TOKENS.reduce((s, v) => s + v, 0);
  const max = Math.max(...DAILY_TOKENS);
  const lastIdx = DAILY_TOKENS.length - 1;

  return (
    <div className="mt-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">Token 使用</div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          示例数据
        </span>
      </div>

      {/* 汇总 */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">今日 token 用量</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
            {formatTokens(today)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">近 30 天 token 用量</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
            {formatTokens(total)}
          </div>
        </div>
      </div>

      {/* 柱状图 */}
      <div className="mt-4 flex h-28 items-end gap-[3px]">
        {DAILY_TOKENS.map((v, i) => (
          <div
            key={i}
            title={`第 ${i + 1} 天：${formatTokens(v)} token`}
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
            className={cn(
              "flex-1 rounded-t-sm transition-colors",
              i === lastIdx
                ? "bg-muted-foreground/40"
                : "bg-violet-500/70 hover:bg-violet-500",
            )}
          />
        ))}
      </div>

      {/* 日期标签 */}
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>30 天前</span>
        <span>今日</span>
      </div>
    </div>
  );
}
