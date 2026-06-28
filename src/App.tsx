import { useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { Workspace } from "@/components/workspace/workspace";
import { TitleBar } from "@/components/workspace/titlebar";

const MIN_WINDOW_WIDTH = 1100;
const MIN_WINDOW_HEIGHT = 760;

function App() {
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    const appWindow = getCurrentWindow();
    let disposed = false;
    let applyingBounds = false;
    let unlistenResize: VoidFunction | undefined;

    const clampWindowSize = async () => {
      if (applyingBounds) return;

      const scaleFactor = await appWindow.scaleFactor();
      const currentSize = (await appWindow.innerSize()).toLogical(scaleFactor);
      const width = Math.max(currentSize.width, MIN_WINDOW_WIDTH);
      const height = Math.max(currentSize.height, MIN_WINDOW_HEIGHT);

      if (width === currentSize.width && height === currentSize.height) return;

      applyingBounds = true;
      try {
        await appWindow.setSize(new LogicalSize(width, height));
      } finally {
        applyingBounds = false;
      }
    };

    const applyWindowBounds = async () => {
      const minSize = new LogicalSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);

      await appWindow.setMinSize(minSize);
      await appWindow.setSizeConstraints({
        minWidth: MIN_WINDOW_WIDTH,
        minHeight: MIN_WINDOW_HEIGHT,
      });
      await clampWindowSize();

      const unlisten = await appWindow.onResized(() => {
        void clampWindowSize().catch((error) => {
          console.warn("Unable to clamp native window size", error);
        });
      });

      if (disposed) {
        unlisten();
      } else {
        unlistenResize = unlisten;
      }
    };

    void applyWindowBounds().catch((error) => {
      console.warn("Unable to apply native window bounds", error);
    });

    return () => {
      disposed = true;
      unlistenResize?.();
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="min-h-0 flex-1">
        <Workspace />
      </div>
    </div>
  );
}

export default App;
