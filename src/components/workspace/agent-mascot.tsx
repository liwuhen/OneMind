/** 不同「牛马」的配色（屏幕色调 + 键盘色），循环取用。 */
export const MASCOT_ACCENTS = [
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
];

/**
 * 智能体吉祥物（类腾讯 Marvis）：象棋马坐在桌前对着电脑。
 * working=true 时屏幕滚动发光、马打字微动、键盘亮起；否则屏幕熄灭、飘 zZ 睡眠。
 * accent/index 让每只「牛马」配色与节奏各不相同。
 */
export function AgentMascot({
  working,
  label,
  accent = MASCOT_ACCENTS[0],
  index = 0,
}: {
  working: boolean;
  label?: string;
  accent?: string;
  index?: number;
}) {
  const delay = `${(index % 6) * 0.18}s`;
  const bobDur = `${0.42 + (index % 4) * 0.06}s`;

  return (
    <div className="flex w-44 flex-col items-center">
      <div className="relative h-44 w-44 select-none">
        {/* 地面投影 */}
        <div className="absolute bottom-5 left-1/2 h-3 w-40 -translate-x-1/2 rounded-[50%] bg-black/10 blur-md dark:bg-black/40" />

        {/* 显示器 */}
        <div className="absolute bottom-[3.6rem] left-1/2 -translate-x-1/2">
          <div
            className="h-[3.6rem] w-[5.2rem] overflow-hidden rounded-md border-[3px] border-foreground/80"
            style={{
              backgroundColor: working ? `${accent}26` : "rgba(0,0,0,0.82)",
              animation: working
                ? "mascot-screen-glow 2.2s ease-in-out infinite"
                : undefined,
              animationDelay: delay,
            }}
          >
            {working && (
              <div
                className="size-full"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, ${accent} 0 2px, transparent 2px 7px)`,
                  backgroundSize: "100% 14px",
                  opacity: 0.6,
                  animation: "mascot-screen-scan 0.9s linear infinite",
                  animationDelay: delay,
                }}
              />
            )}
          </div>
          {/* 支架 + 底座 */}
          <div className="mx-auto h-2.5 w-4 bg-foreground/70" />
          <div className="mx-auto h-1.5 w-11 rounded-sm bg-foreground/70" />
        </div>

        {/* 桌面 */}
        <div className="absolute bottom-7 left-1/2 h-2 w-40 -translate-x-1/2 rounded-full bg-muted-foreground/25" />

        {/* 彩色键盘条（工作时亮起） */}
        <div
          className="absolute bottom-[1.9rem] left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-sm"
          style={{ backgroundColor: working ? accent : "var(--muted)" }}
        />

        {/* 象棋马（剪影本体） */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[4.2rem] leading-none text-foreground"
          style={{
            animation: working
              ? `mascot-bob ${bobDur} ease-in-out infinite`
              : "mascot-breathe 3.5s ease-in-out infinite",
            animationDelay: delay,
          }}
        >
          ♞
        </div>

        {/* 睡眠 zZ */}
        {!working && (
          <>
            <span
              className="absolute bottom-[6.5rem] left-[58%] text-sm font-bold text-muted-foreground"
              style={{ animation: "mascot-float-z 2.4s ease-in-out infinite" }}
            >
              z
            </span>
            <span
              className="absolute bottom-[6.5rem] left-[63%] text-base font-bold text-muted-foreground"
              style={{
                animation: "mascot-float-z 2.4s ease-in-out infinite",
                animationDelay: "0.8s",
              }}
            >
              Z
            </span>
          </>
        )}
      </div>

      {label && (
        <p className="-mt-1 max-w-[10rem] truncate text-center text-xs text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  );
}
