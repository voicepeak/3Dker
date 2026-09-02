import { cameraIntentSchema } from "@semantic-director/camera-dsl";
import { projectSchema, type ProjectFile, type ProjectState } from "./ProjectSchema";

export function serializeProject(state: ProjectState): string {
  const file: ProjectFile = projectSchema.parse({
    version: "0.1",
    name: state.name,
    scene: state.scene,
    actors: state.actors,
    cameraIntents: state.cameraIntents,
    activeIntentId: state.activeIntentId,
    playback: state.playback,
  });
  return JSON.stringify(file, null, 2);
}

export function deserializeProject(json: string): ProjectState {
  const parsed = projectSchema.parse(JSON.parse(json));
  return {
    version: "0.1",
    name: parsed.name,
    scene: { entities: parsed.scene.entities },
    actors: parsed.actors,
    cameraIntents: parsed.cameraIntents.map((intent) => cameraIntentSchema.parse(intent)),
    activeIntentId: parsed.activeIntentId,
    playback: parsed.playback,
  };
}

export function exportCameraJson(state: ProjectState, samples: unknown): string {
  return JSON.stringify(
    {
      version: "0.1",
      duration: state.playback.duration,
      intent: state.cameraIntents.find((i) => i.id === state.activeIntentId) ?? state.cameraIntents[0],
      samples,
    },
    null,
    2,
  );
}
