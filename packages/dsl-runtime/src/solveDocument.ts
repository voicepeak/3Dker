import type { CameraRuntimeState, Diagnostic, ThreeDkerShotDocument } from "@semantic-director/dsl-core";
import { activeCameraOps, solveCameraAt } from "./cameraSolver";
import { activeEntityOps, solveEntities } from "./entitySolver";
import { resolveScene, type ResolvedEntity, type ResolvedScene } from "./resolveScene";

export interface DocumentSolve {
  scene: ResolvedScene;
  entities: Record<string, ResolvedEntity>;
  camera: CameraRuntimeState;
  diagnostics: Diagnostic[];
  activeCamera: ReturnType<typeof activeCameraOps>;
  activeEntities: ReturnType<typeof activeEntityOps>;
}

export function solveDocument(doc: ThreeDkerShotDocument, time: number): DocumentSolve {
  const scene = resolveScene(doc.scene);
  const cache = new Map<number, Record<string, ResolvedEntity>>();
  const liveAt = (t: number) => {
    const key = Math.round(t * 60);
    const hit = cache.get(key);
    if (hit) return hit;
    const solved = solveEntities(scene, doc.entityMotion, t).entities;
    cache.set(key, solved);
    return solved;
  };
  const entities = liveAt(time);
  const camera = solveCameraAt(scene, entities, doc.cameraShot, time, liveAt);
  return {
    scene,
    entities,
    camera: camera.camera,
    diagnostics: [...scene.diagnostics, ...camera.diagnostics],
    activeCamera: activeCameraOps(doc.cameraShot, time),
    activeEntities: activeEntityOps(doc.entityMotion, time),
  };
}

export function sampleDocument(doc: ThreeDkerShotDocument, fps = 30) {
  const duration = Math.max(doc.cameraShot.duration, doc.entityMotion.duration);
  const count = Math.max(2, Math.round(duration * fps) + 1);
  return Array.from({ length: count }, (_, i) => {
    const time = (i / (count - 1)) * duration;
    return { time, ...solveDocument(doc, time) };
  });
}
