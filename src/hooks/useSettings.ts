import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark" | "one-dark";
export type FontScale = "small" | "medium" | "large";

export const DEFAULT_WORKSPACE = "~/.onemind/default_workspace";

export interface Settings {
  theme: ThemeMode;
  frosted: boolean;
  opacity: number; // 20–100
  fontScale: FontScale;
  workspace: string;
}

const KEY = "onemind.settings";
const DEFAULTS: Settings = {
  theme: "dark",
  frosted: false,
  opacity: 55,
  fontScale: "medium",
  workspace: DEFAULT_WORKSPACE,
};

const FONT_PX: Record<FontScale, string> = {
  small: "14px",
  medium: "15px",
  large: "16.5px",
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useSettings() {
  const initial = load();
  const [theme, setTheme] = useState<ThemeMode>(initial.theme);
  const [frosted, setFrosted] = useState<boolean>(initial.frosted);
  const [opacity, setOpacity] = useState<number>(initial.opacity);
  const [fontScale, setFontScale] = useState<FontScale>(initial.fontScale);
  const [workspace, setWorkspace] = useState<string>(initial.workspace);

  // 持久化
  useEffect(() => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ theme, frosted, opacity, fontScale, workspace }),
    );
  }, [theme, frosted, opacity, fontScale, workspace]);

  // 应用主题
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark =
        theme === "dark" ||
        theme === "one-dark" ||
        (theme === "system" && mq.matches);
      const root = document.documentElement;
      root.classList.toggle("dark", isDark);
      root.classList.toggle("one-dark", theme === "one-dark");
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // 应用磨砂背景
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("frosted", frosted);
    root.style.setProperty("--surface-opacity", String(opacity / 100));
  }, [frosted, opacity]);

  // 应用字体大小（rem 基准，整体界面跟着缩放）
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_PX[fontScale];
  }, [fontScale]);

  const isDark =
    theme === "dark" ||
    theme === "one-dark" ||
    (theme === "system" && systemPrefersDark());

  return {
    theme,
    setTheme,
    frosted,
    setFrosted,
    opacity,
    setOpacity,
    fontScale,
    setFontScale,
    workspace,
    setWorkspace,
    isDark,
  };
}
