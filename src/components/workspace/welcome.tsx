import { Sparkles } from "lucide-react";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import type { AgentInfo } from "@/types";

const SURPRISE = "给我讲一个关于程序员的冷笑话。";

/** 空状态：居中欢迎语 + 输入卡片 + 小惊喜。 */
export function Welcome({
  agents,
  selected,
  onSelectAgent,
  onSend,
  busy,
  showSelector,
}: {
  agents: AgentInfo[];
  selected: string;
  onSelectAgent: (id: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  showSelector: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          👋 你好，欢迎回来！
        </h1>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>今天想做点什么？</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <PromptInput
          agents={agents}
          selected={selected}
          onSelectAgent={onSelectAgent}
          onSend={onSend}
          busy={busy}
          autoFocus
          showSelector={showSelector}
        />

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => onSend(SURPRISE)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
          >
            <Sparkles className="size-3.5" />
            小惊喜
          </button>
        </div>
      </div>
    </div>
  );
}
