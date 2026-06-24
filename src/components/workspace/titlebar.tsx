import { BrainCircuit, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/utils";

function CtrlButton({
  title,
  danger,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-full w-12 items-center justify-center text-muted-foreground transition-colors",
        danger
          ? "hover:bg-destructive hover:text-white"
          : "hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** 自绘标题栏：跟随主题色，可拖拽，含窗口控制按钮。 */
export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex h-9 shrink-0 items-center justify-between border-b border-border/30 bg-background select-none"
    >
      <div data-tauri-drag-region className="flex items-center pl-3">
        <BrainCircuit className="size-4 rotate-90 text-violet-400" />
      </div>
      <div className="flex h-full">
        <CtrlButton title="最小化" onClick={() => getCurrentWindow().minimize()}>
          <Minus className="size-4" />
        </CtrlButton>
        <CtrlButton
          title="最大化"
          onClick={() => getCurrentWindow().toggleMaximize()}
        >
          <Square className="size-3" />
        </CtrlButton>
        <CtrlButton title="关闭" danger onClick={() => getCurrentWindow().close()}>
          <X className="size-4" />
        </CtrlButton>
      </div>
    </div>
  );
}
