import { PlaybackClock } from "../hooks/usePlaybackClock";
import { CameraIntentPanel } from "../panels/CameraIntentPanel";
import { Inspector } from "../panels/Inspector";
import { PlaybackBar } from "../panels/PlaybackBar";
import { PromptPanel } from "../panels/PromptPanel";
import { ScenePanel } from "../panels/ScenePanel";
import { Toolbar } from "../panels/Toolbar";
import { CameraPreview } from "../viewport/CameraPreview";
import { Viewport } from "../viewport/Viewport";

export function App() {
  return (
    <div className="app">
      <PlaybackClock />
      <Toolbar />
      <ScenePanel />
      <Viewport />
      <Inspector />
      <PromptPanel />
      <CameraIntentPanel />
      <PlaybackBar />
      <CameraPreview />
    </div>
  );
}
