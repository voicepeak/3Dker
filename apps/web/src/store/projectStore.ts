import { create } from "zustand";
import type { CameraIntent, FramingType, MotionIntent } from "@semantic-director/camera-dsl";
import { cameraIntentSchema } from "@semantic-director/camera-dsl";
import { sampleAt, solveCamera, type SolveResult } from "@semantic-director/camera-solver";
import {
  applyCameraPlan,
  applyDirectorPrompt,
  applyScenePlan,
  CAMERA_SYSTEM,
  completeJson,
  defaultLlmSettings,
  demoA,
  demoB,
  demoC,
  deserializeProject,
  emptyProject,
  exportCameraJson,
  SCENE_SYSTEM,
  serializeProject,
  type LlmSettings,
  type ProjectState,
} from "@semantic-director/project-core";
import {
  createEntity,
  defaultAnchor,
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
  llm: LlmSettings;
  llmBusy: "idle" | "scene" | "camera";
  llmError?: string;
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
  setLlm: (patch: Partial<LlmSettings>) => void;
  generateScene: (text: string) => Promise<void>;
  generateCamera: (text: string) => Promise<void>;
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

function sceneCatalog() {
  return useProjectStore.getState().scene.entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    type: entity.semanticType,
    anchors: Object.keys(entity.anchors),
    position: entity.transform.position,
  }));
}

const LLM_STORAGE_KEY = "semantic-director-llm";

function loadLlmSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(LLM_STORAGE_KEY);
    return raw ? { ...defaultLlmSettings(), ...JSON.parse(raw) } : defaultLlmSettings();
  } catch {
    return defaultLlmSettings();
  }
}

function saveLlmSettings(settings: LlmSettings) {
  localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(settings));
}

let lastPlaybackUi = 0;
let playbackClockTime = 0;
let resolveTimer: number | undefined;

export function peekPlaybackTime(): number {
  const playback = useProjectStore.getState().playback;
  return playback.playing ? playbackClockTime : playback.currentTime;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...fromProject(demoA()),
  previewOpen: false,
  llm: loadLlmSettings(),
  llmBusy: "idle",
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
    const current = get().cameraIntents.find((i) => i.id === get().activeIntentId) ?? get().cameraIntents[0];
    if (patch.duration !== undefined && (!Number.isFinite(patch.duration) || patch.duration < 0.5)) return;
    const targetPatch = patch.target ?? current.target;
    const targetEntity = get().scene.entities.find((entity) => entity.id === targetPatch.entityId);
    const safeTarget = targetEntity
      ? {
          entityId: targetEntity.id,
          anchor: targetEntity.anchors[targetPatch.anchor] ? targetPatch.anchor : defaultAnchor(targetEntity),
        }
      : targetPatch;
    try {
      const next = cameraIntentSchema.parse({
        ...current,
        ...patch,
        target: safeTarget,
        duration: Math.min(Math.max(patch.duration ?? current.duration, 0.5), 60),
      });
      set((s) => ({
        cameraIntents: s.cameraIntents.map((intent) => (intent.id === s.activeIntentId ? next : intent)),
      }));
      get().resolve();
    } catch (error) {
      set({ solveError: error instanceof Error ? error.message : "摄像机参数无效" });
    }
  },
  setMotion: (motion) => get().updateIntent({ motion }),
  setFraming: (type) => get().updateIntent({ framing: { type } }),
  setFocal: (mm) => get().updateIntent({ lens: { focalLength: mm } }),
  setDuration: (duration) => {
    get().updateIntent({ duration });
    set((s) => ({ playback: { ...s.playback, duration } }));
  },
  resolve: () => {
    if (resolveTimer !== undefined) window.clearTimeout(resolveTimer);
    resolveTimer = window.setTimeout(() => {
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
    }, 60);
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
    let next = (playbackClockTime || playback.currentTime) + dt;
    if (next >= duration) next = 0;
    playbackClockTime = next;
    const now = performance.now();
    if (now - lastPlaybackUi < 33) return;
    lastPlaybackUi = now;
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
  setLlm: (patch) => {
    const llm = { ...get().llm, ...patch };
    saveLlmSettings(llm);
    set({ llm });
  },
  generateScene: async (text) => {
    const prompt = text.trim();
    if (!prompt) return;
    set({ llmBusy: "scene", llmError: undefined });
    try {
      const raw = await completeJson(get().llm, SCENE_SYSTEM, prompt);
      const result = applyScenePlan(raw, get().scene.entities);
      const first = result.entities[0];
      const current = get().cameraIntents.find((i) => i.id === get().activeIntentId) ?? get().cameraIntents[0];
      const stillThere = result.entities.find((entity) => entity.id === current.target.entityId);
      const targetEntity = stillThere ?? first;
      const cameraIntents = get().cameraIntents.map((item) => {
        if (item.id !== current.id || !targetEntity) return item;
        const heightRef = item.height;
        const heightOk =
          heightRef?.type === "anchor" && result.entities.some((entity) => entity.id === heightRef.entityId);
        return {
          ...item,
          target: {
            entityId: targetEntity.id,
            anchor: targetEntity.anchors[item.target.anchor] ? item.target.anchor : defaultAnchor(targetEntity),
          },
          height: heightOk ? heightRef : undefined,
        };
      });
      set({
        scene: { entities: result.entities },
        cameraIntents,
        selectedId: first.id,
        promptLog: ["场景调度", ...result.logs],
        llmError: undefined,
      });
      get().resolve();
    } catch (error) {
      set({ llmError: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ llmBusy: "idle" });
    }
  },
  generateCamera: async (text) => {
    const prompt = text.trim();
    if (!prompt) return;
    const entities = get().scene.entities;
    if (!entities.length) {
      set({ llmError: "请先生成或布置场景" });
      return;
    }
    set({ llmBusy: "camera", llmError: undefined });
    try {
      const intent = get().cameraIntents.find((i) => i.id === get().activeIntentId) ?? get().cameraIntents[0];
      const user = `当前场景清单：\n${JSON.stringify(sceneCatalog(), null, 2)}\n\n运镜描述：\n${prompt}`;
      const raw = await completeJson(get().llm, CAMERA_SYSTEM, user);
      const result = applyCameraPlan(raw, entities, intent);
      set({
        cameraIntents: get().cameraIntents.map((item) => (item.id === intent.id ? result.intent : item)),
        promptLog: ["摄像机意图", ...result.logs],
      });
      get().resolve();
    } catch (error) {
      set({ llmError: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ llmBusy: "idle" });
    }
  },
  applyPrompt: (text) => {
    const s = get();
    const intent = s.cameraIntents.find((i) => i.id === s.activeIntentId) ?? s.cameraIntents[0];
    try {
      const result = applyDirectorPrompt(text, { entities: s.scene.entities, intent });
      const first = result.entities[0];
      const stillThere = result.entities.find((entity) => entity.id === result.intent.target.entityId);
      const targetEntity = stillThere ?? first;
      set({
        scene: { entities: result.entities },
        cameraIntents: s.cameraIntents.map((item) =>
          item.id === intent.id && targetEntity
            ? {
                ...result.intent,
                target: {
                  entityId: targetEntity.id,
                  anchor: targetEntity.anchors[result.intent.target.anchor]
                    ? result.intent.target.anchor
                    : defaultAnchor(targetEntity),
                },
              }
            : item,
        ),
        selectedId: first?.id ?? s.selectedId,
        promptLog: result.logs,
        llmError: undefined,
      });
      get().resolve();
    } catch (error) {
      set({ llmError: error instanceof Error ? error.message : String(error) });
    }
  },
  togglePreview: (open) =>
    set((s) => ({ previewOpen: open === undefined ? !s.previewOpen : open })),
}));

export function currentSample() {
  const { solve, playback } = useProjectStore.getState();
  if (!solve) return undefined;
  return sampleAt(solve, playback.currentTime);
}
