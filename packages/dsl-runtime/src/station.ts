import type { CameraSetup, Scene, SceneEntity, ThreeDkerShotDocument } from "@semantic-director/dsl-core";

function boxEntity(
  id: string,
  type: SceneEntity["type"],
  semantic: string,
  position: [number, number, number],
  size: [number, number, number],
  extra: Partial<SceneEntity> = {},
): SceneEntity {
  return {
    id,
    type,
    semantic,
    geometry: { type: "box", size },
    transform: { position },
    physical: { collision: true, occluder: type !== "person" && type !== "platform", walkable: type === "platform" },
    ...extra,
  };
}

export const STATION_SCENE: Scene = {
  id: "abandoned_station",
  world: { origin: [0, 0, 0], upAxis: "Y", forwardAxis: "Z", unit: "meter", handedness: "right" },
  zones: [
    { id: "platform_center", shape: { type: "box", center: [0, 0, 0], size: [12, 0.2, 40] } },
    { id: "platform_end", shape: { type: "box", center: [0, 0, 8], size: [12, 0.2, 4] } },
    { id: "platform_far", shape: { type: "box", center: [0, 0, 16], size: [10, 0.2, 4] } },
    { id: "train_rear", shape: { type: "box", center: [-5.4, 0, 10], size: [3, 0.2, 4] } },
  ],
  entities: [
    {
      id: "person_a",
      type: "person",
      semantic: "人物 A",
      geometry: { type: "box", size: [0.5, 1.75, 0.35] },
      transform: { position: [0, 0, 0], rotation: { yaw: 0 } },
      anchors: [
        { id: "root", position: [0, 0, 0] },
        { id: "waist", position: [0, 0.95, 0] },
        { id: "chest", position: [0, 1.28, 0] },
        { id: "head", position: [0, 1.64, 0] },
        { id: "eyes", position: [0, 1.62, 0.08] },
      ],
      physical: { collision: true, occluder: false, walkable: false },
    },
    {
      id: "person_b",
      type: "person",
      semantic: "人物 B",
      geometry: { type: "box", size: [0.5, 1.72, 0.35] },
      transform: { position: [-4.8, 0, 11], rotation: { yaw: 90 } },
      anchors: [
        { id: "root", position: [0, 0, 0] },
        { id: "chest", position: [0, 1.26, 0] },
        { id: "head", position: [0, 1.62, 0] },
      ],
      physical: { collision: true, occluder: false },
    },
    boxEntity("platform_01", "platform", "站台", [0, -0.08, 0], [12, 0.16, 42]),
    boxEntity("train_01", "train", "废弃列车前节", [-5.6, 0, -2], [2.7, 3.3, 14]),
    boxEntity("train_02", "train", "废弃列车后节", [-5.6, 0, 12], [2.7, 3.3, 12]),
    boxEntity("column_01", "column", "站台柱 1", [-2.1, 0, -8], [0.5, 4.2, 0.5]),
    boxEntity("column_02", "column", "站台柱 2", [-2.1, 0, -2], [0.5, 4.2, 0.5]),
    boxEntity("column_03", "column", "站台柱 3", [-2.1, 0, 4], [0.5, 4.2, 0.5]),
    boxEntity("column_04", "column", "站台柱 4", [2.2, 0, 1], [0.5, 4.2, 0.5]),
    boxEntity("column_05", "column", "站台柱 5", [2.2, 0, 8], [0.5, 4.2, 0.5]),
    boxEntity("bench_01", "furniture", "长椅", [3.4, 0, -4], [1.9, 0.5, 0.58]),
    boxEntity("bench_02", "furniture", "长椅", [3.4, 0, 3.2], [1.9, 0.5, 0.58]),
    boxEntity("bench_03", "furniture", "长椅", [3.4, 0, 10], [1.9, 0.5, 0.58]),
    boxEntity("lamp_01", "prop", "路灯", [4.2, 0, -10], [0.2, 3.4, 0.2]),
    boxEntity("lamp_02", "prop", "路灯", [4.2, 0, 0], [0.2, 3.4, 0.2]),
    boxEntity("lamp_03", "prop", "路灯", [4.2, 0, 12], [0.2, 3.4, 0.2]),
    boxEntity("canopy_01", "architecture", "雨棚", [0.4, 0, 2], [7.4, 3.6, 18]),
    boxEntity("booth_01", "architecture", "售票亭", [3.6, 0, 17], [2.4, 2.6, 2.2]),
    boxEntity("wall_end", "wall", "尽头墙", [0, 0, 20.4], [12, 4.2, 0.35]),
  ],
};

export const DEFAULT_CAMERA: CameraSetup = {
  placement: {
    relativeTo: { type: "entity", entityId: "person_a", anchor: "root" },
    region: "front",
    distance: 3.2,
    height: { relativeTo: { type: "entity", entityId: "person_a", anchor: "chest" } },
  },
  orientation: {
    lookAt: { target: { type: "entity", entityId: "person_a" }, anchor: "chest" },
  },
  lens: { focalLength: 35 },
  framing: { target: "person_a", shotSize: "medium" },
};

export function emptyMotion(duration: number): ThreeDkerShotDocument["entityMotion"] {
  return { duration, tracks: [] };
}

export function shotDoc(
  id: string,
  duration: number,
  cameraOps: ThreeDkerShotDocument["cameraShot"]["operators"],
  entityMotion: ThreeDkerShotDocument["entityMotion"] = emptyMotion(duration),
  cameraSetup: CameraSetup = DEFAULT_CAMERA,
  extras: Partial<ThreeDkerShotDocument["cameraShot"]> = {},
): ThreeDkerShotDocument {
  return {
    dsl: "3dker",
    version: "1.0",
    kind: "shot",
    scene: STATION_SCENE,
    initialState: { entities: [], camera: cameraSetup },
    entityMotion,
    cameraShot: {
      id,
      duration,
      cameraSetup,
      operators: cameraOps,
      constraints: [
        { type: "collision", mode: "warn" },
        { type: "visibility", mode: "warn" },
      ],
      ...extras,
    },
  };
}
