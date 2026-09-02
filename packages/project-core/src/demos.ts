import { cameraIntentSchema, type CameraIntent } from "@semantic-director/camera-dsl";
import { createEntity, type SceneEntity } from "@semantic-director/scene-core";
import type { ProjectState } from "./ProjectSchema";

function project(name: string, entities: SceneEntity[], intent: CameraIntent): ProjectState {
  return {
    version: "0.1",
    name,
    scene: { entities },
    actors: entities.filter((e) => e.semanticType === "person").map((e) => e.id),
    cameraIntents: [intent],
    activeIntentId: intent.id,
    playback: { duration: intent.duration },
  };
}

export function demoA(): ProjectState {
  const person = createEntity("person", { name: "人物", position: [0, 0, 0] });
  person.id = "person_01";
  const vase = createEntity("vase", { name: "花瓶", position: [0.9, 0, 0.55] });
  vase.id = "vase_01";
  const intent = cameraIntentSchema.parse({
    id: "camera_intent_001",
    motion: {
      type: "orbit",
      angle: 360,
      direction: "clockwise",
      startAzimuth: 0,
    },
    target: { entityId: person.id, anchor: "chest" },
    height: { type: "anchor", entityId: vase.id, anchor: "top", priority: "soft" },
    lens: { focalLength: 35 },
    framing: { type: "medium" },
    composition: { screenX: 0.5, screenY: 0.5 },
    duration: 6,
    smoothness: 0.25,
  });
  return project("示例 A · 环绕", [person, vase], intent);
}

export function demoB(): ProjectState {
  const person = createEntity("person", { name: "人物", position: [0, 0, 0] });
  person.id = "person_01";
  const table = createEntity("table", { name: "桌子", position: [-1.1, 0, 0.2] });
  table.id = "table_01";
  const wall = createEntity("wall", { name: "墙", position: [0, 0, 2.6] });
  wall.id = "wall_01";
  wall.bounds.size = [5, 2.5, 0.22];
  wall.anchors = {
    center: [0, 1.25, 0],
    top: [0, 2.5, 0],
    bottom: [0, 0, 0],
    left: [-2, 1.25, 0],
    right: [2, 1.25, 0],
    front: [0, 1.25, 0.09],
    back: [0, 1.25, -0.09],
  };
  const intent = cameraIntentSchema.parse({
    id: "camera_intent_002",
    motion: { type: "dolly", direction: "in", startSide: "front", distance: 0.9 },
    target: { entityId: person.id, anchor: "chest" },
    height: { type: "anchor", entityId: table.id, anchor: "top", priority: "soft" },
    lens: { focalLength: 50 },
    framing: { type: "medium_close" },
    duration: 4,
    smoothness: 0.2,
  });
  return project("示例 B · 推进碰撞", [person, table, wall], intent);
}

export function demoC(): ProjectState {
  const person = createEntity("person", { name: "人物", position: [0, 0, -2] });
  person.id = "person_01";
  person.motionPath = {
    duration: 6,
    waypoints: [
      [0, 0, -2],
      [0.4, 0, 0],
      [0, 0, 2.5],
    ],
  };
  const intent = cameraIntentSchema.parse({
    id: "camera_intent_003",
    motion: { type: "follow", offset: { side: "back_left" } },
    target: { entityId: person.id, anchor: "chest" },
    lens: { focalLength: 35 },
    framing: { type: "medium" },
    duration: 6,
    smoothness: 0.4,
  });
  return project("示例 C · 跟随", [person], intent);
}

export function emptyProject(): ProjectState {
  const person = createEntity("person", { name: "人物", position: [0, 0, 0] });
  const intent = cameraIntentSchema.parse({
    id: "camera_intent_new",
    motion: { type: "static", startSide: "front" },
    target: { entityId: person.id, anchor: "chest" },
    lens: { focalLength: 35 },
    framing: { type: "medium" },
    duration: 5,
  });
  return project("未命名", [person], intent);
}
