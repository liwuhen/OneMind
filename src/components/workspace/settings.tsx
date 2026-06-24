import { useState } from "react";
import { Info, Settings2, Sparkles, Wrench, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WORKSPACE,
  type FontScale,
  type ThemeMode,
} from "@/hooks/useSettings";

type TabId = "general" | "memory" | "tools" | "skills" | "about";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "通用", icon: <Settings2 className="size-4" /> },
  { id: "memory", label: "记忆", icon: <Clock className="size-4" /> },
  { id: "tools", label: "工具", icon: <Wrench className="size-4" /> },
  { id: "skills", label: "技能", icon: <Sparkles className="size-4" /> },
  { id: "about", label: "关于", icon: <Info className="size-4" /> },
];

const THEME_OPTIONS: { id: ThemeMode; name: string }[] = [
  { id: "system", name: "跟随系统" },
  { id: "light", name: "淡蓝" },
  { id: "dark", name: "深色" },
  { id: "one-dark", name: "One Dark" },
];

const FONT_STEPS: FontScale[] = ["small", "medium", "large"];
const FONT_LABEL: Record<FontScale, string> = {
  small: "小",
  medium: "中",
  large: "大",
};

/** 一行设置：左侧标签+描述，右侧控件。 */
function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && (
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {desc}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** 一张设置卡片。 */
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card/40">
      <h3 className="border-b px-5 py-3.5 text-sm font-semibold">{title}</h3>
      <div className="divide-y px-5">{children}</div>
    </div>
  );
}

function General(props: GeneralProps) {
  const {
    theme,
    setTheme,
    fontScale,
    setFontScale,
    workspace,
    setWorkspace,
    frosted,
    setFrosted,
    opacity,
    setOpacity,
  } = props;
  const [lang, setLang] = useState("zh-CN");

  return (
    <div className="space-y-6">
      <Card title="基础设置">
        <SettingRow label="语言" desc="选择后立即应用。">
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh-CN">简体中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="主题" desc="淡蓝、深色或跟随系统。">
          <Select value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="字体大小" desc="调整整体界面的文字尺寸。">
          <div className="w-[260px]">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>小</span>
              <span>中</span>
              <span>大</span>
            </div>
            <Slider
              value={[FONT_STEPS.indexOf(fontScale)]}
              min={0}
              max={2}
              step={1}
              onValueChange={(v) => setFontScale(FONT_STEPS[v[0]])}
            />
            <div className="mt-2 text-xs text-muted-foreground">
              当前：{FONT_LABEL[fontScale]}
            </div>
          </div>
        </SettingRow>

        <SettingRow
          label="默认工作目录"
          desc={`首次启动默认使用 ${DEFAULT_WORKSPACE}；你也可以改成别的目录。`}
        >
          <Input
            value={workspace}
            onChange={(e) => setWorkspace(e.currentTarget.value)}
            className="w-[220px] font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWorkspace(DEFAULT_WORKSPACE)}
          >
            还原默认
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="目录选择暂未接入"
            disabled
          >
            选择目录
          </Button>
        </SettingRow>
      </Card>

      <Card title="外观">
        <SettingRow
          label="启用磨砂效果"
          desc="开启后侧栏与各类弹层呈半透明毛玻璃质感（背景模糊）。"
        >
          <Switch checked={frosted} onCheckedChange={setFrosted} />
        </SettingRow>
        <SettingRow label="表面不透明度" desc="磨砂效果的透明程度。">
          <div className="w-[260px]">
            <Slider
              value={[opacity]}
              min={20}
              max={100}
              step={1}
              disabled={!frosted}
              onValueChange={(v) => setOpacity(v[0])}
            />
            <div className="mt-2 text-right text-xs text-muted-foreground">
              {opacity}%
            </div>
          </div>
        </SettingRow>
      </Card>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
      「{label}」敬请期待
    </div>
  );
}

interface GeneralProps {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  fontScale: FontScale;
  setFontScale: (f: FontScale) => void;
  workspace: string;
  setWorkspace: (s: string) => void;
  frosted: boolean;
  setFrosted: (v: boolean) => void;
  opacity: number;
  setOpacity: (v: number) => void;
}

export function Settings({
  open,
  onOpenChange,
  ...general
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
} & GeneralProps) {
  const [tab, setTab] = useState<TabId>("general");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">设置</DialogTitle>
          <DialogDescription>
            根据你的偏好调整 OneMind 的界面和行为。
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[68vh] border-t">
          <nav className="w-48 shrink-0 space-y-0.5 border-r border-border/30 bg-sidebar p-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  tab === t.id && "font-medium",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === "general" ? (
              <General {...general} />
            ) : (
              <Placeholder label={TABS.find((t) => t.id === tab)!.label} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
