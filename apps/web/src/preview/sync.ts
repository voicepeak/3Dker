import type { CameraIntent } from "@semantic-director/camera-dsl";
import type { SolveResult } from "@semantic-director/camera-solver";
import type { SceneEntity } from "@semantic-director/scene-core";

export const PREVIEW_CHANNEL = "semantic-director-preview";

export interface PreviewSnapshot {
  name: string;
  entities: SceneEntity[];
  intent?: CameraIntent;
  solve?: SolveResult;
  currentTime: number;
  duration: number;
  playing: boolean;
}

export type PreviewMessage =
  | { type: "snapshot"; payload: PreviewSnapshot }
  | { type: "playback"; payload: { currentTime: number; duration: number; playing: boolean } }
  | { type: "hello" };

export function previewChannel(): BroadcastChannel {
  return new BroadcastChannel(PREVIEW_CHANNEL);
}
