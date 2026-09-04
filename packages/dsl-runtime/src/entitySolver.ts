import {
  isOperatorActive,
  settledProgress,
  type Diagnostic,
  type EntityMotionPlan,
  type EntityOperator,
  type EntityRuntimeState,
  type SpatialReference,
  type Vec3,
} from "@semantic-director/dsl-core";
import { sampleCatmullRom } from "@semantic-director/shared";
import {
  addVec,
  asNumber,
  asString,
  asVec3,
  eulerToQuat,
  headingQuat,
  lerpVec,
  localAxes,
  lookRotation,
  quatMul,
  scaleVec,
} from "./math";
import { applyRuntime, runtimeFromResolved, type ResolvedEntity, type ResolvedScene } from "./resolveScene";
import { frameOfTarget, resolveSpatial } from "./spatial";

function directionVec(direction: string, yaw: number, space: string): Vec3 {
  const axes = space === "world" ? localAxes(0) : localAxes(yaw);
  switch (direction) {
    case "forward":
      return axes.forward;
    case "backward":
      return scaleVec(axes.forward, -1);
    case "left":
      return scaleVec(axes.right, -1);
    case "right":
      return axes.right;
    case "up":
      return axes.up;
    case "down":
      return scaleVec(axes.up, -1);
    default:
      return axes.forward;
  }
}

function applyOp(
  scene: ResolvedScene,
  live: Record<string, ResolvedEntity>,
  base: EntityRuntimeState,
  op: EntityOperator,
  time: number,
): EntityRuntimeState {
  const progress = settledProgress(op.timing, time);
  const next: EntityRuntimeState = {
    ...base,
    time,
    position: [...base.position] as Vec3,
    rotation: { ...base.rotation },
    pose: base.pose ? { ...base.pose } : undefined,
    semanticState: base.semanticState ? { ...base.semanticState } : undefined,
  };

  if (op.type === "static" || progress <= 0) return next;

  if (op.type === "translate") {
    const dir = directionVec(
      asString(op.parameters?.direction, "forward"),
      live[base.entityId]?.yaw ?? 0,
      asString(op.parameters?.space, "local"),
    );
    next.position = addVec(base.position, scaleVec(dir, asNumber(op.parameters?.distance, 1) * progress));
    return next;
  }

  if (op.type === "move_to") {
    const dest = op.parameters?.destination as SpatialReference | undefined;
    const target = dest ? resolveSpatial(scene, dest, live) : base.position;
    next.position = lerpVec(base.position, target, progress);
    const dx = target[0] - base.position[0];
    const dz = target[2] - base.position[2];
    if (Math.hypot(dx, dz) > 1e-4) next.rotation = headingQuat(Math.atan2(dx, dz));
    return next;
  }

  if (op.type === "rotate") {
    const axis = asString(op.parameters?.axis, "yaw");
    const angle = asNumber(op.parameters?.angle, 90) * progress;
    const delta =
      axis === "pitch" ? { pitch: angle } : axis === "roll" ? { roll: angle } : { yaw: angle };
    next.rotation = quatMul(base.rotation, eulerToQuat(delta));
    return next;
  }

  if (op.type === "path") {
    const geometry = op.parameters?.geometry as { points?: Vec3[] } | undefined;
    const points = geometry?.points ?? [];
    if (points.length >= 2) {
      next.position = sampleCatmullRom(points, progress);
      const ahead = sampleCatmullRom(points, Math.min(1, progress + 0.04));
      const dx = ahead[0] - next.position[0];
      const dz = ahead[2] - next.position[2];
      if (Math.hypot(dx, dz) > 1e-4) next.rotation = headingQuat(Math.atan2(dx, dz));
    }
    return next;
  }

  if ((op.type === "follow" || op.type === "attach") && op.target) {
    const host = live[op.target.entityId];
    if (!host) return next;
    const region = (
      typeof op.parameters?.region === "string"
        ? op.parameters.region
        : op.type === "follow"
          ? "back"
          : undefined
    ) as SpatialReference["region"] | undefined;
    next.position = resolveSpatial(
      scene,
      {
        relativeTo: { type: "entity", entityId: host.id, anchor: op.target.anchor ?? "root" },
        region,
        distance: asNumber(op.parameters?.distance, op.type === "follow" ? 1.4 : 0),
        offset: asVec3(op.parameters?.offset, [0, 0, 0]),
        height: typeof op.parameters?.height === "number" ? { absolute: Number(op.parameters.height) } : undefined,
      },
      live,
    );
    next.rotation = headingQuat(host.yaw);
    return next;
  }

  if (op.type === "face_target" && op.target) {
    next.rotation = lookRotation(next.position, frameOfTarget(scene, op.target, live).origin);
    return next;
  }

  if (op.type === "pose") {
    next.pose = {
      preset: asString(op.parameters?.to, asString(op.parameters?.preset, "standing")),
      mix: progress,
    };
    return next;
  }

  if (op.type === "state_change") {
    next.semanticState = {
      ...(next.semanticState ?? {}),
      [asString(op.parameters?.key, "state")]: op.parameters?.to ?? true,
    };
  }
  return next;
}

export function solveEntities(
  scene: ResolvedScene,
  plan: EntityMotionPlan,
  time: number,
): { entities: Record<string, ResolvedEntity>; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [...scene.diagnostics];
  const live: Record<string, ResolvedEntity> = Object.fromEntries(
    Object.values(scene.entities).map((entity) => [entity.id, { ...entity }]),
  );

  for (const track of plan.tracks) {
    const entity = live[track.entityId];
    if (!entity) {
      diagnostics.push({
        severity: "error",
        code: "E_REF_NOT_FOUND",
        path: `/entityMotion/tracks/${track.entityId}`,
        message: `未知实体 ${track.entityId}`,
        entityId: track.entityId,
      });
      continue;
    }
    let state = runtimeFromResolved(entity, time);
    const ops = [...track.operators].sort((a, b) => a.timing.start - b.timing.start);
    for (const op of ops) {
      if (time < op.timing.start) continue;
      state = applyOp(scene, live, state, op, time);
      live[track.entityId] = applyRuntime(entity, state);
    }
    live[track.entityId] = applyRuntime(entity, { ...state, time });
  }

  return { entities: live, diagnostics };
}

export function activeEntityOps(plan: EntityMotionPlan, time: number): EntityOperator[] {
  return plan.tracks.flatMap((track) => track.operators.filter((op) => isOperatorActive(op.timing, time)));
}
