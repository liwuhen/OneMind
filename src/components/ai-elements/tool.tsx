import { useState } from "react";
import { ChevronRight, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ToolPart } from "@/lib/chat";

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/** 工具调用 + 结果卡片（可展开查看入参/输出）。 */
export function Tool({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const running = part.state === "running";
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm"
      >
        <Wrench className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{part.name || "tool"}</span>
        {running ? (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="size-3 animate-spin" /> 运行中
          </Badge>
        ) : part.isError ? (
          <Badge variant="destructive">出错</Badge>
        ) : (
          <Badge variant="secondary">完成</Badge>
        )}
        <ChevronRight
          className={cn(
            "ml-auto size-4 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              入参
            </div>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
              {stringify(part.input)}
            </pre>
          </div>
          {part.output !== undefined && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                输出
              </div>
              <pre
                className={cn(
                  "overflow-x-auto rounded p-2 text-xs",
                  part.isError ? "bg-destructive/10" : "bg-muted",
                )}
              >
                {stringify(part.output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
