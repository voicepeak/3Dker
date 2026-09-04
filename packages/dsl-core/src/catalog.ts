import type { CameraPrimitive, EntityPrimitive, RecipeNote } from "./types";

export const CAMERA_PRIMITIVES: readonly CameraPrimitive[] = [
  "static",
  "translate",
  "rotate",
  "orbit",
  "follow",
  "attach",
  "path",
  "look_at",
  "zoom",
  "noise",
  "stabilize",
] as const;

export const ENTITY_PRIMITIVES: readonly EntityPrimitive[] = [
  "static",
  "translate",
  "move_to",
  "rotate",
  "path",
  "follow",
  "attach",
  "face_target",
  "pose",
  "state_change",
] as const;

export const ABSOLUTE_CAMERA_SPATIAL: ReadonlySet<CameraPrimitive> = new Set([
  "static",
  "orbit",
  "follow",
  "attach",
  "path",
]);

export const LIVE_CAMERA_OPS: ReadonlySet<CameraPrimitive> = new Set([
  "follow",
  "attach",
  "look_at",
  "noise",
  "stabilize",
]);

export const CAMERA_CHANNELS: Record<CameraPrimitive, "spatial" | "orientation" | "lens" | "modifier"> = {
  static: "spatial",
  translate: "spatial",
  orbit: "spatial",
  follow: "spatial",
  attach: "spatial",
  path: "spatial",
  rotate: "orientation",
  look_at: "orientation",
  zoom: "lens",
  noise: "modifier",
  stabilize: "modifier",
};

export const HITCHCOCK_RECIPE: RecipeNote = {
  id: "hitchcock",
  name: "希区柯克",
  meaning: "不是基础算子。由摄像机距离变化 + 焦距变化 + 构图锁定组成。",
  expandsTo: ["translate", "zoom", "framing"],
};

export const CAMERA_OP_LABEL: Record<CameraPrimitive, string> = {
  static: "固定",
  translate: "位移",
  rotate: "旋转",
  orbit: "环绕",
  follow: "跟随",
  attach: "绑定",
  path: "路径",
  look_at: "看向",
  zoom: "变焦",
  noise: "手持",
  stabilize: "稳定",
};

export const ENTITY_OP_LABEL: Record<EntityPrimitive, string> = {
  static: "静止",
  translate: "平移",
  move_to: "走到",
  rotate: "转向",
  path: "路径",
  follow: "跟随",
  attach: "绑定",
  face_target: "朝向",
  pose: "姿态",
  state_change: "状态",
};

export function isCameraPrimitive(type: string): type is CameraPrimitive {
  return (CAMERA_PRIMITIVES as readonly string[]).includes(type);
}

export function isEntityPrimitive(type: string): type is EntityPrimitive {
  return (ENTITY_PRIMITIVES as readonly string[]).includes(type);
}
