import { memo } from "react";
import { Loader2 } from "lucide-react";
import { Markdown } from "./markdown";
import { Reasoning } from "./reasoning";
import { Tool } from "./tool";
import type { AssistantPart, ChatItem } from "@/lib/chat";

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/5 px-4 py-2.5 text-sm whitespace-pre-wrap text-foreground">
        {text}
      </div>
    </div>
  );
}

function AssistantMessage({
  parts,
  done,
}: {
  parts: AssistantPart[];
  done: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div className="min-w-0 max-w-[80%] space-y-2 rounded-2xl rounded-bl-sm bg-muted/50 px-4 py-2.5">
        {parts.map((part, i) => {
          if (part.type === "text")
            return <Markdown key={i}>{part.text}</Markdown>;
          if (part.type === "reasoning")
            return <Reasoning key={i} text={part.text} />;
          return <Tool key={i} part={part} />;
        })}
        {!done && parts.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> 思考中…
          </div>
        )}
      </div>
    </div>
  );
}

function SystemMessage({
  level,
  text,
}: {
  level: "info" | "error" | "debug";
  text: string;
}) {
  if (level === "error")
    return (
      <div className="mx-auto max-w-[90%] rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-center text-xs text-destructive">
        {text}
      </div>
    );
  if (level === "debug")
    return (
      <div className="mx-auto max-w-[90%] truncate text-center font-mono text-[11px] text-muted-foreground/60">
        {text}
      </div>
    );
  return (
    <div className="text-center text-xs text-muted-foreground">{text}</div>
  );
}

export const Message = memo(function Message({ item }: { item: ChatItem }) {
  if (item.role === "user") return <UserMessage text={item.text} />;
  if (item.role === "assistant")
    return (
      <AssistantMessage
        parts={item.parts}
        done={item.done}
      />
    );
  return <SystemMessage level={item.level} text={item.text} />;
});
