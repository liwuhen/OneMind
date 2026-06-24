import { useState } from "react";
import { Brain, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 可折叠的「思考过程」块。 */
export function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Brain className="size-3.5" />
        <span>思考过程</span>
        <ChevronRight
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
        />
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2 text-xs whitespace-pre-wrap text-muted-foreground italic">
          {text}
        </div>
      )}
    </div>
  );
}
