import { useEffect, useRef } from "react";
import { MessageSquareDashed } from "lucide-react";
import { Message } from "./message";
import type { ChatItem } from "@/lib/chat";

/** 会话区：渲染对话项并自动滚到底。 */
export function Conversation({ items }: { items: ChatItem[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {items.length === 0 ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <MessageSquareDashed className="size-10 opacity-40" />
            <p className="text-sm">
              选择一个 agent 并「开始会话」，然后在下方输入。
            </p>
          </div>
        ) : (
          items.map((item) => <Message key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
