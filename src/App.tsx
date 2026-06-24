import { Workspace } from "@/components/workspace/workspace";
import { TitleBar } from "@/components/workspace/titlebar";

function App() {
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
