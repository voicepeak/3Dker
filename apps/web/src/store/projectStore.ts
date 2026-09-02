import { create } from "zustand";
import type { CameraIntent, FramingType, MotionIntent } from "@semantic-director/camera-dsl";
import { cameraIntentSchema } from "@semantic-director/camera-dsl";
import { sampleAt, solveCamera, type SolveResult } from "@semantic-director/camera-solver";
import {
  applyDirectorPrompt,
  demoA,
  demoB,
  demoC,
  deserializeProject,
  emptyProject,
  exportCameraJson,
  serializeProject,
  type ProjectState,
} from "@semantic-director/project-core";
import {
  createEntity,
  duplicateEntity,
  type SceneEntity,
} from "@semantic-director/scene-core";
import type { SemanticType, Vec3 } from "@semantic-director/shared";

interface PlaybackState {
  currentTime: number;
  playing: boolean;
}

interface ProjectStore extends ProjectState {
  selectedId?: string;
  playback: ProjectState["playback"] & PlaybackState;
  solve?: SolveResult;
  solveError?: string;
  promptLog: string[];
  previewOpen: boolean;
  select: (id?: string) => void;
  addEntity: (type: SemanticType) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  updateEntity: (id: string, patch: Partial<SceneEntity> | ((e: SceneEntity) => SceneEntity)) => void;
  setTransform: (id: string, field: "position" | "rotation" | "scale", value: Vec3) => void;
  setMotionPath: (id: string, waypoints: Vec3[], duration: number) => void;
  clearMotionPath: (id: string) => void;
  updateIntent: (patch: Partial<CameraIntent>) => void;
  setMotion: (motion: MotionIntent) => void;
  setFraming: (type: FramingType) => void;
  setFocal: (mm: number) => void;
  setDuration: (duration: number) => void;
  resolve: () => void;
  play: () => void;
  pause: () => void;
  scrub: (time: number) => void;
  tick: (dt: number) => void;
  loadDemo: (which: "A" | "B" | "C" | "empty") => void;
  saveToFile: () => void;
  loadFromText: (json: string) => void;
  exportCamera: () => void;
  applyPrompt: (text: string) => void;
  togglePreview: (open?: boolean) => void;
}

function withSolve(state: ProjectState): Pick<ProjectStore, "solve" | "solveError" | "playback"> {
  const intent = state.cameraIntents.find((i) => i.id === state.activeIntentId) ?? state.cameraIntents[0];
  try {
    const solve = solveCamera(state.scene, intent);
    return {
      solve,
      solveError: undefined,
      playback: {
        duration: intent.duration,
        currentTime: 0,
        playing: false,
      },
    };
  } catch (error) {
    return {
      solve: undefined,
      solveError: error instanceof Error ? error.message : String(error),
      playback: { duration: intent.duration, currentTime: 0, playing: false },
    };
  }
}

function fromProject(project: ProjectState) {
  const solved = withSolve(project);
  return {
    version: project.version,
    name: project.name,
    scene: project.scene,
    actors: project.actors,
    cameraIntents: project.cameraIntents,
    activeIntentId: project.activeIntentId,
    selectedId: project.scene.entities[0]?.id,
    solve: solved.solve,
    solveError: solved.solveError,
    playback: solved.playback,
    promptLog: [] as string[],
  };
}

let lastPlaybackUi = 0;
let playbackClockTime = 0;

export function peekPlaybackTime(): number {
  const playback = useProjectStore.getState().playback;
  return playback.playing ? playbackClockTime || playback.currentTime : playback.currentTime;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...fromProject(demoA()),
  previewOpen: false,
  select: (id) => set({ selectedId: id }),
  addEntity: (type) => {
    const entity = createEntity(type, { position: [1.4 * Math.random(), 0, 1.2 * Math.random()] });
    set((s) => ({ scene: { entities: [...s.scene.entities, entity] }, selectedId: entity.id }));
    get().resolve();
  },
  removeSelected: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    set((s) => {
      const entities = s.scene.entities.filter((e) => e.id !== selectedId);
      if (entities.length === 0) return s;
      return { scene: { entities }, selectedId: entities[0].id };
    });
    get().resolve();
  },
  duplicateSelected: () => {
    const { selectedId, scene } = get();
    const entity = scene.entities.find((e) => e.id === selectedId);
    if (!entity) return;
    const copy = duplicateEntity(entity);
    set({ scene: { entities: [...scene.entities, copy] }, selectedId: copy.id });
    get().resolve();
  },
  updateEntity: (id, patch) => {
    set((s) => ({
      scene: {
        entities: s.scene.entities.map((e) => {
          if (e.id !== id) return e;
          return typeof patch === "function" ? patch(e) : { ...e, ...patch };
        }),
      },
    }));
    get().resolve();
  },
  setTransform: (id, field, value) => {
    set((s) => ({
      scene: {
        entities: s.scene.entities.map((e) =>
          e.id === id ? { ...e, transform: { ...e.transform, [field]: value } } : e,
        ),
      },
    }));
    get().resolve();
  },
  setMotionPath: (id, waypoints, duration) => {
    get().updateEntity(id, (e) => ({ ...e, motionPath: { waypoints, duration } }));
  },
  clearMotionPath: (id) => {
    get().updateEntity(id, (e) => {
      const next = { ...e };
      delete next.motionPath;
      return next;
    });
  },
  updateIntent: (patch) => {
    set((s) => ({
      cameraIntents: s.cameraIntents.map((intent) =>
        intent.id === s.activeIntentId ? cameraIntentSchema.parse({ ...intent, ...patch }) : intent,
      ),
    }));
    get().resolve();
  },
  setMotion: (motion) => get().updateIntent({ motion }),
  setFraming: (type) => get().updateIntent({ framing: { type } }),
  setFocal: (mm) => get().updateIntent({ lens: { focalLength: mm } }),
  setDuration: (duration) => {
    get().updateIntent({ duration });
    set((s) => ({ playback: { ...s.playback, duration } }));
  },
  resolve: () => {
    const s = get();
    const intent = s.cameraIntents.find((i) => i.id === s.activeIntentId) ?? s.cameraIntents[0];
    try {
      const solve = solveCamera(s.scene, intent);
      set({
        solve,
        solveError: undefined,
        playback: { ...s.playback, duration: intent.duration },
      });
    } catch (error) {
      set({ solve: undefined, solveError: error instanceof Error ? error.message : String(error) });
    }
  },
  play: () => {
    lastPlaybackUi = 0;
    const playback = get().playback;
    playbackClockTime = playback.currentTime;
    set({ playback: { ...playback, playing: true } });
  },
  pause: () => set((s) => ({ playback: { ...s.playback, playing: false } })),
  scrub: (time) =>
    set((s) => ({
      playback: {
        ...s.playback,
        currentTime: Math.min(s.playback.duration, Math.max(0, time)),
        playing: false,
      },
    })),
  tick: (dt) => {
    const playback = get().playback;
    if (!playback.playing) return;
    const duration = Math.max(playback.duration, 0.001);
    let next = playback.currentTime + dt;
    if (next >= duration) next = 0;
    const now = performance.now();
    if (now - lastPlaybackUi < 33) {
      playbackClockTime = next;
      return;
    }
    lastPlaybackUi = now;
    playbackClockTime = next;
    set({ playback: { duration: playback.duration, playing: true, currentTime: next } });
  },
  loadDemo: (which) => {
    const project = which === "A" ? demoA() : which === "B" ? demoB() : which === "C" ? demoC() : emptyProject();
    set(fromProject(project));
  },
  saveToFile: () => {
    const s = get();
    const json = serializeProject({
      version: "0.1",
      name: s.name,
      scene: s.scene,
      actors: s.actors,
      cameraIntents: s.cameraIntents,
      activeIntentId: s.activeIntentId,
      playback: { duration: s.playback.duration },
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  loadFromText: (json) => {
    set(fromProject(deserializeProject(json)));
  },
  exportCamera: () => {
    const s = get();
    if (!s.solve) return;
    const json = exportCameraJson(
      {
        version: "0.1",
        name: s.name,
        scene: s.scene,
        actors: s.actors,
        cameraIntents: s.cameraIntents,
        activeIntentId: s.activeIntentId,
        playback: { duration: s.playback.duration },
      },
      s.solve.samples,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/\s+/g, "_")}_camera.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  applyPrompt: (text) => {
    const s = get();
    const intent = s.cameraIntents.find((i) => i.id === s.activeIntentId) ?? s.cameraIntents[0];
    const result = applyDirectorPrompt(text, { entities: s.scene.entities, intent });
    set({
      scene: { entities: result.entities },
      cameraIntents: s.cameraIntents.map((item) => (item.id === intent.id ? result.intent : item)),
      selectedId: result.entities[0]?.id ?? s.selectedId,
      promptLog: result.logs,
    });
    get().resolve();
  },
  togglePreview: (open) =>
    set((s) => ({ previewOpen: open === undefined ? !s.previewOpen : open })),
}));

export function currentSample() {
  const { solve, playback } = useProjectStore.getState();
  if (!solve) return undefined;
  return sampleAt(solve, playback.currentTime);
}
