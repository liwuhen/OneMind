import { useState, type KeyboardEvent } from "react";
import { ArrowUp, Loader2, Paperclip, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentInfo } from "@/types";

/** 输入卡片：textarea + 工具栏（附件 / agent 选择 / 发送）。Enter 发送，Shift+Enter 换行。 */
export function PromptInput({
  agents,
  selected,
  onSelectAgent,
  onSend,
  busy,
  autoFocus,
  showSelector = true,
}: {
  agents: AgentInfo[];
  selected: string;
  onSelectAgent: (id: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  autoFocus?: boolean;
  showSelector?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="rounded-2xl border bg-background shadow-sm transition-colors focus-within:border-ring/60">
      <Textarea
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="今天我能为你做些什么？"
        className="max-h-44 min-h-[52px] resize-none border-0 bg-transparent px-4 pt-3.5 text-[15px] shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center gap-1 px-2.5 pb-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          title="附件（暂未实现）"
          disabled
        >
          <Paperclip className="size-4" />
        </Button>

        {showSelector && (
          <Select value={selected} onValueChange={onSelectAgent}>
            <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-xs font-medium text-muted-foreground shadow-none hover:bg-accent hover:text-foreground">
              <Zap className="size-3.5" />
              <SelectValue placeholder="选择 agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          size="icon"
          className="ml-auto size-8 rounded-full"
          onClick={submit}
          disabled={busy || !value.trim()}
          aria-label="发送"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
