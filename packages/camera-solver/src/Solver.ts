import type { CameraIntent } from "@semantic-director/camera-dsl";
import { evaluateScene, findEntity, type SceneGraph } from "@semantic-director/scene-core";
import { degToRad, MIN_ORBIT_RADIUS, SAMPLE_FPS, type Vec3 } from "@semantic-director/shared";
import { resolveHeight, targetEvaluated, targetWorld } from "./AnchorSolver";
import { checkCameraCollision } from "./constraint/CollisionSolver";
import { checkVisibility } from "./constraint/VisibilitySolver";
import { solveCameraDistance, startAzimuthFromSide } from "./FramingSolver";
import { solveLookAt } from "./LookAtSolver";
import { cranePosition } from "./motion/CraneSolver";
import { dollyPosition } from "./motion/DollySolver";
import { followPosition } from "./motion/FollowSolver";
import { orbitPosition } from "./motion/OrbitSolver";
import { staticPosition } from "./motion/StaticSolver";
import { truckPosition } from "./motion/TruckSolver";
import { smoothSamples } from "./smooth/PathSmoother";
import type { CameraSample, ConstraintWarning, SolveResult } from "./types";

const MAX_SAMPLES = 181;

function sampleCount(duration: number): number {
  const dur = Math.min(Math.max(duration, 0.5), 60);
  return Math.min(MAX_SAMPLES, Math.max(2, Math.round(dur * SAMPLE_FPS) + 1));
}

function startAzimuth(intent: CameraIntent, yaw: number): number {
  const motion = intent.motion;
  if (motion.type === "orbit") {
    if (motion.startSide) return startAzimuthFromSide(motion.startSide, yaw);
    return degToRad(motion.startAzimuth) + yaw;
  }
  if ("startSide" in motion && motion.startSide) return startAzimuthFromSide(motion.startSide, yaw);
  return startAzimuthFromSide("front", yaw);
}

function rawPosition(
  scene: SceneGraph,
  intent: CameraIntent,
  time: number,
  progress: number,
  radius: number,
  start: Vec3 | null,
): Vec3 {
  const target = targetEvaluated(scene, intent, time);
  const look = targetWorld(scene, intent, time);
  const height = resolveHeight(scene, intent, time, look[1]);
  const azimuth = startAzimuth(intent, target.yaw);
  const motion = intent.motion;

  if (motion.type === "static") {
    return staticPosition(look, radius, height, azimuth);
  }
  if (motion.type === "orbit") {
    return orbitPosition(
      look,
      radius,
      height,
      azimuth,
      degToRad(motion.angle),
      progress,
      motion.direction === "clockwise",
    );
  }
  if (motion.type === "follow") {
    return followPosition(target, motion.offset.distance ?? radius, height, motion.offset.side);
  }

  const origin = start ?? staticPosition(look, radius, height, azimuth);
  if (motion.type === "dolly") {
    const endDistance =
      motion.distance ?? (motion.direction === "in" ? radius * 0.45 : radius * 1.7);
    return dollyPosition(look, origin, endDistance, progress);
  }
  if (motion.type === "truck") {
    return truckPosition(origin, look, motion.distance, progress, motion.direction === "left");
  }
  if (motion.type === "crane") {
    return cranePosition(origin, motion.distance, progress, motion.direction === "up");
  }
  return origin;
}

export function solveCamera(scene: SceneGraph, intent: CameraIntent): SolveResult {
  const targetEntity = findEntity(scene, intent.target.entityId) ?? scene.entities[0];
  if (!targetEntity) {
    throw new Error("场景为空，无法求解摄像机");
  }
  const resolved = {
    ...intent,
    target: {
      entityId: targetEntity.id,
      anchor: targetEntity.anchors[intent.target.anchor]
        ? intent.target.anchor
        : targetEntity.semanticType === "person"
          ? "chest"
          : "center",
    },
  };

  const duration = Math.min(Math.max(resolved.duration || 5, 0.5), 60);
  const count = sampleCount(duration);
  const t0 = targetEvaluated(scene, resolved, 0);
  const radius = Math.max(
    MIN_ORBIT_RADIUS,
    solveCameraDistance({
      target: t0,
      focalLength: resolved.lens.focalLength,
      framing: resolved.framing.type,
      sensorHeight: resolved.lens.sensorHeight,
    }),
  );

  const start = rawPosition(scene, resolved, 0, 0, radius, null);
  const raw: CameraSample[] = [];

  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const time = progress * duration;
    const look = targetWorld(scene, resolved, time);
    const position = rawPosition(scene, resolved, time, progress, radius, start);
    raw.push({
      time,
      position,
      quaternion: solveLookAt(position, look),
      focalLength: resolved.lens.focalLength,
      collision: false,
      visible: true,
    });
  }

  const smoothed = smoothSamples(raw, resolved.smoothness ?? 0.35);
  const warnings: ConstraintWarning[] = [];
  const ignore = new Set([resolved.target.entityId]);
  if (resolved.height?.type === "anchor") ignore.add(resolved.height.entityId);

  const checkEvery = Math.max(1, Math.floor(smoothed.length / 90));
  const samples = smoothed.map((sample, index) => {
    if (index % checkEvery !== 0 && index !== smoothed.length - 1) return sample;
    const entities = evaluateScene(scene, sample.time);
    const collision = checkCameraCollision(sample.position, entities, ignore);
    const look = targetWorld(scene, resolved, sample.time);
    const vis = checkVisibility(sample.position, look, entities, resolved.target.entityId);
    if (collision.hit) {
      warnings.push({
        time: sample.time,
        kind: "collision",
        message: `摄像机在 ${sample.time.toFixed(1)}s 与 ${collision.entityId} 发生碰撞`,
        position: sample.position,
        entityId: collision.entityId,
      });
    }
    if (!vis.visible) {
      warnings.push({
        time: sample.time,
        kind: "occlusion",
        message: `目标在 ${sample.time.toFixed(1)}s 被遮挡`,
        position: sample.position,
        entityId: vis.occluderId,
      });
    }
    return {
      ...sample,
      collision: collision.hit,
      visible: vis.visible,
      collisionEntityId: collision.entityId,
      occluderId: vis.occluderId,
    };
  });

  const hardCollision = samples.some((s) => s.collision);
  return {
    samples,
    warnings,
    duration,
    valid: !hardCollision,
  };
}

export function sampleAt(result: SolveResult, time: number): CameraSample {
  if (result.samples.length === 0) {
    throw new Error("No camera samples");
  }
  const t = Math.min(result.duration, Math.max(0, time));
  const last = result.samples[result.samples.length - 1];
  if (t >= last.time) return last;
  for (let i = 0; i < result.samples.length - 1; i++) {
    const a = result.samples[i];
    const b = result.samples[i + 1];
    if (t >= a.time && t <= b.time) {
      const u = (t - a.time) / Math.max(1e-6, b.time - a.time);
      return u < 0.5 ? a : b;
    }
  }
  return result.samples[0];
}
