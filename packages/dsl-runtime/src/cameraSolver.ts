import {
  CAMERA_CHANNELS,
  isOperatorActive,
  operatorWindow,
  settledProgress,
  type CameraConstraint,
  type CameraOperator,
  type CameraRuntimeState,
  type CameraShot,
  type Diagnostic,
  type Vec3,
} from "@semantic-director/dsl-core";
import { normalize, sampleCatmullRom } from "@semantic-director/shared";
import {
  addVec,
  asNumber,
  asString,
  asVec3,
  eulerToQuat,
  horizontalDistance,
  lookRotation,
  quatMul,
  quatSlerp,
  scaleVec,
  subVec,
  viewForward,
  viewRight,
  viewUp,
} from "./math";
import { cameraStateFromSetup, type ResolvedEntity, type ResolvedScene } from "./resolveScene";
import { frameOfTarget, resolveSpatial } from "./spatial";

export interface SolveSample {
  time: number;
  camera: CameraRuntimeState;
  entities: Record<string, ResolvedEntity>;
}

function hashNoise(time: number, seed: number): number {
  const x = Math.sin(time * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function cameraDirection(state: CameraRuntimeState, direction: string, space: string): Vec3 {
  if (space === "world") {
    if (direction === "forward") return [0, 0, 1];
    if (direction === "backward") return [0, 0, -1];
    if (direction === "left") return [-1, 0, 0];
    if (direction === "right") return [1, 0, 0];
    if (direction === "up") return [0, 1, 0];
    if (direction === "down") return [0, -1, 0];
  }
  if (direction === "forward") return viewForward(state.rotation);
  if (direction === "backward") return scaleVec(viewForward(state.rotation), -1);
  if (direction === "left") return scaleVec(viewRight(state.rotation), -1);
  if (direction === "right") return viewRight(state.rotation);
  if (direction === "up") return viewUp(state.rotation);
  if (direction === "down") return scaleVec(viewUp(state.rotation), -1);
  return viewForward(state.rotation);
}

function orbitPoint(center: Vec3, radius: number, height: number, azimuth: number): Vec3 {
  return [center[0] + radius * Math.sin(azimuth), height, center[2] + radius * Math.cos(azimuth)];
}

type LiveAt = (time: number) => Record<string, ResolvedEntity>;

function applySpatial(
  scene: ResolvedScene,
  live: Record<string, ResolvedEntity>,
  liveAt: LiveAt,
  shot: CameraShot,
  base: CameraRuntimeState,
  op: CameraOperator,
  time: number,
): CameraRuntimeState {
  const progress = settledProgress(op.timing, time);
  const next = { ...base, time, position: [...base.position] as Vec3, rotation: { ...base.rotation } };
  if (time < op.timing.start) return next;

  if (op.type === "static") return next;

  if (op.type === "translate") {
    const distance = asNumber(op.parameters?.distance, 1) * progress;
    const space = asString(op.parameters?.space, "camera");
    if (space === "target" && op.target) {
      const center = frameOfTarget(scene, op.target, live).origin;
      const dir = normalize(subVec(center, base.position));
      next.position = addVec(base.position, scaleVec(dir, distance));
      return next;
    }
    const dir = cameraDirection(base, asString(op.parameters?.direction, "forward"), space);
    next.position = addVec(base.position, scaleVec(dir, distance));
    return next;
  }

  if (op.type === "orbit" && op.target) {
    const center = frameOfTarget(scene, op.target, live).origin;
    const startRadius = Math.max(0.35, horizontalDistance(base.position, center));
    const radius = asNumber(op.parameters?.radius, startRadius);
    const height = asNumber(op.parameters?.height, base.position[1]);
    const startAzimuth = Math.atan2(base.position[0] - center[0], base.position[2] - center[2]);
    const signed = asString(op.parameters?.direction, "clockwise") === "clockwise" ? -1 : 1;
    const angle = (asNumber(op.parameters?.angle, 90) * Math.PI) / 180;
    next.position = orbitPoint(center, radius, height, startAzimuth + signed * angle * progress);
    return next;
  }

  if (op.type === "follow" && op.target) {
    const { end } = operatorWindow(op.timing);
    const evalT = Math.min(time, end - 1e-4);
    const frozen = liveAt(evalT);
    next.position = resolveSpatial(
      scene,
      {
        relativeTo: { type: "entity", entityId: op.target.entityId, anchor: op.target.anchor ?? "root" },
        region: asString(op.parameters?.region, "back_left") as "back_left",
        distance: asNumber(op.parameters?.distance, 3),
        height:
          typeof op.parameters?.height === "number"
            ? { absolute: Number(op.parameters.height) }
            : shot.cameraSetup.placement.height,
      },
      frozen,
    );
    return next;
  }

  if (op.type === "attach" && op.target) {
    next.position = resolveSpatial(
      scene,
      {
        relativeTo: { type: "entity", entityId: op.target.entityId, anchor: op.target.anchor ?? "head" },
        offset: asVec3(op.parameters?.offset, [0.05, 0.12, 0.18]),
      },
      live,
    );
    return next;
  }

  if (op.type === "path") {
    const geometry = op.parameters?.geometry as { points?: Vec3[] } | undefined;
    const points = geometry?.points ?? [];
    if (points.length >= 2) next.position = sampleCatmullRom(points, progress);
    return next;
  }

  return next;
}

function lookPoint(
  scene: ResolvedScene,
  live: Record<string, ResolvedEntity>,
  op: CameraOperator,
): Vec3 {
  const entity = op.target ? live[op.target.entityId] : undefined;
  const anchor = op.target?.anchor ?? "chest";
  if (entity?.worldAnchors[anchor]) return entity.worldAnchors[anchor];
  if (op.target) return frameOfTarget(scene, op.target, live).origin;
  return [0, 1.25, 0];
}

function applyLooks(
  scene: ResolvedScene,
  liveAt: LiveAt,
  state: CameraRuntimeState,
  ops: CameraOperator[],
  time: number,
): CameraRuntimeState {
  const looks = ops
    .filter((op) => op.type === "look_at" && op.target && time >= op.timing.start)
    .sort((a, b) => a.timing.start - b.timing.start);
  if (!looks.length) return state;
  const current = looks[looks.length - 1];
  const previous = looks[looks.length - 2];
  const currentLive = liveAt(Math.min(time, operatorWindow(current.timing).end - 1e-4));
  const to = lookRotation(state.position, lookPoint(scene, currentLive, current));
  if (!previous) return { ...state, rotation: to };
  const blendDur = Math.min(1.25, current.timing.duration);
  const u = settledProgress({ start: current.timing.start, duration: blendDur, profile: "ease_in_out" }, time);
  if (u >= 1) return { ...state, rotation: to };
  const prevLive = liveAt(Math.min(time, operatorWindow(previous.timing).end - 1e-4));
  const from = lookRotation(state.position, lookPoint(scene, prevLive, previous));
  return { ...state, rotation: quatSlerp(from, to, u) };
}

function applyOrientation(
  state: CameraRuntimeState,
  op: CameraOperator,
  time: number,
): CameraRuntimeState {
  const progress = settledProgress(op.timing, time);
  if (progress <= 0 || op.type !== "rotate") return state;
  const axis = asString(op.parameters?.axis, "yaw");
  const angle = asNumber(op.parameters?.angle, 45) * progress;
  const delta = axis === "pitch" ? { pitch: angle } : axis === "roll" ? { roll: angle } : { yaw: angle };
  return { ...state, rotation: quatMul(state.rotation, eulerToQuat(delta)) };
}

function applyLens(state: CameraRuntimeState, op: CameraOperator, time: number): CameraRuntimeState {
  const progress = settledProgress(op.timing, time);
  if (op.type !== "zoom" || progress <= 0) return state;
  const from = asNumber(op.parameters?.from, state.focalLength);
  const to = asNumber(op.parameters?.to, from);
  return { ...state, focalLength: from + (to - from) * progress };
}

function applyModifier(state: CameraRuntimeState, op: CameraOperator, time: number): CameraRuntimeState {
  const progress = settledProgress(op.timing, time);
  if (progress <= 0) return state;
  if (op.type === "noise") {
    const strength = asNumber(op.parameters?.strength, 0.2) * progress;
    const dx = (hashNoise(time, 1) - 0.5) * 2 * strength * 0.08;
    const dy = (hashNoise(time, 2) - 0.5) * 2 * strength * 0.05;
    const dz = (hashNoise(time, 3) - 0.5) * 2 * strength * 0.08;
    const yaw = (hashNoise(time, 4) - 0.5) * 2 * strength * 4;
    const pitch = (hashNoise(time, 5) - 0.5) * 2 * strength * 2;
    return {
      ...state,
      position: addVec(state.position, [dx, dy, dz]),
      rotation: quatMul(state.rotation, eulerToQuat({ yaw, pitch })),
    };
  }
  return state;
}

function framingTargetId(shot: CameraShot): string | undefined {
  const framed = shot.cameraSetup.framing?.target;
  if (Array.isArray(framed)) return framed[0];
  if (framed) return framed;
  const look = shot.cameraSetup.orientation.lookAt?.target;
  return look?.type === "entity" ? look.entityId : undefined;
}

function subjectLook(live: Record<string, ResolvedEntity>, id: string): Vec3 | undefined {
  return live[id]?.worldAnchors.chest ?? live[id]?.worldAnchors.eyes ?? live[id]?.position;
}

function subjectDistance(live: Record<string, ResolvedEntity>, id: string, camera: CameraRuntimeState): number {
  const look = subjectLook(live, id);
  if (!look) return 1;
  return Math.max(0.25, horizontalDistance(camera.position, look));
}

function subjectDistance3d(live: Record<string, ResolvedEntity>, id: string, camera: CameraRuntimeState): number {
  const look = subjectLook(live, id);
  if (!look) return 1;
  return Math.max(0.35, Math.hypot(camera.position[0] - look[0], camera.position[1] - look[1], camera.position[2] - look[2]));
}

function applyFramingLock(
  scene: ResolvedScene,
  live: Record<string, ResolvedEntity>,
  shot: CameraShot,
  state: CameraRuntimeState,
  time: number,
  liveAt: LiveAt,
): CameraRuntimeState {
  const constraint = shot.constraints?.find((c) => c.type === "framing");
  const lock = shot.locks?.framing || Boolean(constraint);
  if (!lock) return state;
  const from = asNumber(constraint?.parameters?.from, 0);
  if (time + 1e-6 < from) return state;
  const targetId = framingTargetId(shot);
  if (!targetId) return state;
  const refTime = from;
  if (Math.abs(time - refTime) < 1e-4) return state;
  const ref = solveCameraAt(scene, liveAt(refTime), shot, refTime, liveAt, { skipLock: true }).camera;
  const refLive = liveAt(refTime);
  const hold = asString(constraint?.parameters?.hold, "focal");
  if (hold === "distance") {
    const look = subjectLook(live, targetId);
    if (!look) return state;
    const refDist = subjectDistance3d(refLive, targetId, ref);
    const away = subVec(state.position, look);
    const len = Math.hypot(away[0], away[1], away[2]);
    const dir = len < 1e-4 ? [0, 0.2, -1] : [away[0] / len, away[1] / len, away[2] / len];
    return {
      ...state,
      position: [look[0] + dir[0] * refDist, look[1] + dir[1] * refDist, look[2] + dir[2] * refDist],
    };
  }
  const refDist = subjectDistance(refLive, targetId, ref);
  const nowDist = subjectDistance(live, targetId, state);
  return {
    ...state,
    focalLength: Math.max(8, Math.min(300, ref.focalLength * (nowDist / refDist))),
  };
}

function collide(position: Vec3, live: Record<string, ResolvedEntity>): string | undefined {
  for (const entity of Object.values(live)) {
    if (!entity.collision || entity.type === "person" || entity.type === "platform") continue;
    const hx = (entity.size[0] * entity.scale[0]) / 2 + 0.12;
    const hy = entity.size[1] * entity.scale[1];
    const hz = (entity.size[2] * entity.scale[2]) / 2 + 0.12;
    if (
      Math.abs(position[0] - entity.position[0]) < hx &&
      position[1] < entity.position[1] + hy &&
      position[1] > entity.position[1] - 0.1 &&
      Math.abs(position[2] - entity.position[2]) < hz
    ) {
      return entity.id;
    }
  }
  return undefined;
}

export function diagnoseCamera(
  live: Record<string, ResolvedEntity>,
  shot: CameraShot,
  state: CameraRuntimeState,
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const hit = collide(state.position, live);
  if (hit) {
    const mode = shot.constraints?.find((c) => c.type === "collision")?.mode ?? "warn";
    out.push({
      severity: mode === "fail" ? "error" : "warning",
      code: "E_CAMERA_IN_COLLISION",
      path: "/cameraShot",
      message: `摄像机与 ${hit} 相交`,
      entityId: hit,
      timeRange: [state.time, state.time],
    });
  }
  const lookOp = shot.operators.find((op) => op.type === "look_at");
  const targetId = lookOp?.target?.entityId;
  if (targetId && live[targetId]) {
    const dist = horizontalDistance(state.position, live[targetId].position);
    if (dist < 0.35) {
      out.push({
        severity: "error",
        code: "E_TARGET_TOO_CLOSE",
        path: "/cameraShot",
        message: "摄像机距目标过近",
        entityId: targetId,
        timeRange: [state.time, state.time],
      });
    }
  }
  return out;
}

export function solveCameraAt(
  scene: ResolvedScene,
  live: Record<string, ResolvedEntity>,
  shot: CameraShot,
  time: number,
  liveAt: LiveAt = () => live,
  options: { skipLock?: boolean } = {},
): { camera: CameraRuntimeState; diagnostics: Diagnostic[] } {
  const t = Math.min(Math.max(time, 0), shot.duration);
  let state = cameraStateFromSetup(scene, shot.cameraSetup, 0, liveAt(0));
  const unknown = shot.operators.flatMap((op) => {
    const type = op.type as string;
    return CAMERA_CHANNELS[op.type]
      ? []
      : [
          {
            severity: "error" as const,
            code: "E_UNSUPPORTED_OPERATOR",
            path: `/cameraShot/operators/${op.id}`,
            message: `${type} 不是摄像机原语。希区柯克请展开为 translate + zoom + framing`,
            operatorId: op.id,
          },
        ];
  });
  const ops = [...shot.operators]
    .filter((op) => t >= op.timing.start && CAMERA_CHANNELS[op.type])
    .sort((a, b) => a.timing.start - b.timing.start || a.id.localeCompare(b.id));
  const now = liveAt(t);
  for (const op of ops.filter((item) => CAMERA_CHANNELS[item.type] === "spatial")) {
    state = applySpatial(scene, now, liveAt, shot, state, op, t);
  }
  state = applyLooks(scene, liveAt, state, ops, t);
  for (const op of ops.filter((item) => item.type === "rotate")) {
    state = applyOrientation(state, op, t);
  }
  const zooming = ops.some((op) => op.type === "zoom" && isOperatorActive(op.timing, t));
  for (const op of ops.filter((item) => CAMERA_CHANNELS[item.type] === "lens")) {
    state = applyLens(state, op, t);
  }
  if (!options.skipLock && !zooming) {
    state = applyFramingLock(scene, now, shot, state, t, liveAt);
  }
  for (const op of ops.filter((item) => CAMERA_CHANNELS[item.type] === "modifier" && isOperatorActive(item.timing, t))) {
    state = applyModifier(state, op, t);
  }
  return {
    camera: { ...state, time: t },
    diagnostics: [...unknown, ...overlappingAbsolute(shot, t), ...diagnoseCamera(now, shot, state)],
  };
}

function overlappingAbsolute(shot: CameraShot, time: number): Diagnostic[] {
  const active = shot.operators.filter(
    (op) => CAMERA_CHANNELS[op.type] === "spatial" && op.type !== "translate" && isOperatorActive(op.timing, time),
  );
  if (active.length < 2) return [];
  return [
    {
      severity: "error",
      code: "E_OPERATOR_CONFLICT",
      path: "/cameraShot/operators",
      message: `绝对空间通道冲突：${active.map((op) => op.type).join(" + ")}`,
      operatorId: active[1].id,
      timeRange: [time, time],
    },
  ];
}

export function activeCameraOps(shot: CameraShot, time: number): CameraOperator[] {
  return shot.operators.filter((op) => isOperatorActive(op.timing, time));
}

export function constraintLabel(constraint: CameraConstraint): string {
  return constraint.type;
}
