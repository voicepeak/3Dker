import { cameraIntentSchema, type CameraIntent } from "@semantic-director/camera-dsl";
import { createEntity, defaultAnchor, type SceneEntity } from "@semantic-director/scene-core";
import type { SemanticType, Vec3 } from "@semantic-director/shared";
import type { CameraPlan, LlmSceneOp, ScenePlan } from "./llmSchema";
import { cameraPlanSchema, scenePlanSchema } from "./llmSchema";

const SIDE_OFFSET: Record<string, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  back_left: [-0.7, 0, -0.7],
  back_right: [0.7, 0, -0.7],
};

const DEFAULT_GAP: Record<SemanticType, number> = {
  person: 0,
  vase: 0.9,
  table: 1.3,
  box: 1,
  wall: 2.6,
  door: 2.2,
};

function findEntity(entities: SceneEntity[], type?: SemanticType, name?: string, id?: string): SceneEntity | undefined {
  if (id) {
    const byId = entities.find((e) => e.id === id);
    if (byId) return byId;
  }
  if (name) {
    const byName = entities.find((e) => e.name === name || e.name.includes(name));
    if (byName) return byName;
  }
  if (type) return entities.find((e) => e.semanticType === type);
  return undefined;
}

function addOffset(base: Vec3, side: string, distance: number): Vec3 {
  const dir = SIDE_OFFSET[side] ?? SIDE_OFFSET.front;
  return [base[0] + dir[0] * distance, 0, base[2] + dir[2] * distance];
}

function applyOp(entities: SceneEntity[], op: LlmSceneOp, logs: string[]): SceneEntity[] {
  if (op.kind === "clear") {
    logs.push("清空场景");
    return [];
  }
  if (op.kind === "upsert") {
    let next = entities;
    let position: Vec3 = [0, 0, 0];
    if (op.at === "origin" && !op.relative) {
      position = [0, 0, 0];
    } else if (op.relative) {
      let host = findEntity(next, op.relative.ofType, op.relative.ofName);
      if (!host) {
        host = createEntity(op.relative.ofType ?? "person", { position: [0, 0, 0] });
        next = [...next, host];
        logs.push(`自动补了${host.name}`);
      }
      position = addOffset(host.transform.position, op.relative.side, op.relative.distance ?? DEFAULT_GAP[op.type]);
    }
    const existing = findEntity(next, op.type, op.name);
    if (existing) {
      existing.transform = { ...existing.transform, position };
      logs.push(`更新${existing.name}`);
      return next;
    }
    const created = createEntity(op.type, { position, name: op.name });
    logs.push(`布置${created.name}`);
    return [...next, created];
  }
  const person = findEntity(entities, op.ofType ?? "person", op.ofName);
  if (person) {
    const start = person.transform.position;
    const end = addOffset(start, op.side, op.distance);
    const mid = addOffset(start, op.side, op.distance * 0.5);
    person.motionPath = { duration: op.duration, waypoints: [start, mid, end] };
    logs.push(`${person.name}沿路径移动`);
  }
  return entities;
}

function unwrapPlan(raw: unknown): unknown {
  if (Array.isArray(raw)) return { ops: raw };
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.ops)) return record;
    if (record.scene && typeof record.scene === "object") return unwrapPlan(record.scene);
  }
  return raw;
}

export function applyScenePlan(raw: unknown, entities: SceneEntity[]): { entities: SceneEntity[]; logs: string[] } {
  const plan: ScenePlan = scenePlanSchema.parse(unwrapPlan(raw));
  const logs: string[] = [];
  let next = entities.map((e) => ({
    ...e,
    transform: { ...e.transform, position: [...e.transform.position] as Vec3 },
  }));
  for (const op of plan.ops) next = applyOp(next, op, logs);
  if (next.length === 0) {
    throw new Error("模型没有生成任何物体，场景未改动");
  }
  return { entities: next, logs };
}

export function applyCameraPlan(raw: unknown, entities: SceneEntity[], intent: CameraIntent): { intent: CameraIntent; logs: string[] } {
  const plan: CameraPlan = cameraPlanSchema.parse(raw);
  const logs: string[] = [];
  const target =
    findEntity(entities, plan.target.entityType, plan.target.entityName, plan.target.entityId) ??
    findEntity(entities, "person") ??
    entities[0];
  if (!target) throw new Error("场景里还没有可看的目标物体");
  const anchor = target.anchors[plan.target.anchor] ? plan.target.anchor : defaultAnchor(target);
  logs.push(`目标 ${target.name}/${anchor}`);

  let height = intent.height;
  if (plan.height === null) height = undefined;
  else if (plan.height) {
    const host = findEntity(entities, plan.height.entityType, plan.height.entityName, plan.height.entityId);
    if (host) {
      const heightAnchor = host.anchors[plan.height.anchor] ? plan.height.anchor : defaultAnchor(host);
      height = { type: "anchor", entityId: host.id, anchor: heightAnchor, priority: "soft" };
      logs.push(`高度 ${host.name}/${heightAnchor}`);
    }
  }

  const next = cameraIntentSchema.parse({
    ...intent,
    motion: plan.motion,
    target: { entityId: target.id, anchor },
    height,
    lens: { focalLength: plan.lens.focalLength },
    framing: { type: plan.framing.type },
    duration: plan.duration,
  });
  logs.push(`${plan.motion.type} · ${plan.lens.focalLength}mm · ${plan.framing.type} · ${plan.duration}s`);
  return { intent: next, logs };
}
