import type { CameraSetup, Scene, SceneEntity, ThreeDkerShotDocument, Vec3 } from "@semantic-director/dsl-core";

const DURATION = 20;

function prop(
  id: string,
  type: SceneEntity["type"],
  semantic: string,
  position: Vec3,
  size: Vec3,
): SceneEntity {
  return {
    id,
    type,
    semantic,
    geometry: { type: "box", size },
    transform: { position },
    physical: { collision: true, occluder: type !== "person" && type !== "platform", walkable: type === "platform" },
  };
}

const A_PATH: Vec3[] = [
  [0, 0, -14],
  [0, 0, -9],
  [0, 0, -3.5],
  [0.08, 0, 1.5],
  [0.15, 0, 4.2],
  [0.18, 0, 5.7],
  [0.18, 0, 5.85],
];

const CAM_PATH: Vec3[] = [
  [0.06, 1.58, -13.18],
  [0.04, 1.48, -8.6],
  [0.02, 1.36, -4.2],
  [0.08, 1.22, 0.2],
  [0.18, 1.12, 3.4],
  [0.28, 1.08, 5.45],
  [0.45, 1.2, 6.6],
  [1.15, 1.7, 6.35],
  [2.05, 2.25, 5.15],
  [2.45, 2.55, 3.85],
  [2.55, 2.62, 3.55],
  [2.55, 2.62, 3.55],
  [2.55, 2.62, 3.55],
];

export const WAREHOUSE_SCENE: Scene = {
  id: "warehouse_aisle",
  world: { origin: [0, 0, 0], upAxis: "Y", forwardAxis: "Z", unit: "meter", handedness: "right" },
  zones: [{ id: "aisle", shape: { type: "box", center: [0, 0, 0], size: [16, 0.2, 44] } }],
  entities: [
    {
      id: "person_a",
      type: "person",
      semantic: "人物 A",
      geometry: { type: "box", size: [0.5, 1.75, 0.35] },
      transform: { position: A_PATH[0], rotation: { yaw: 0 } },
      anchors: [
        { id: "root", position: [0, 0, 0] },
        { id: "waist", position: [0, 0.95, 0] },
        { id: "chest", position: [0, 1.28, 0] },
        { id: "head", position: [0, 1.64, 0] },
        { id: "eyes", position: [0, 1.62, 0.08] },
      ],
      physical: { collision: true, occluder: false },
    },
    prop("floor_01", "platform", "水泥地面", [1, -0.08, 0], [16, 0.16, 40]),
    prop("wall_l", "wall", "左墙", [-7.2, 0, 0], [0.28, 6.2, 40]),
    prop("wall_r", "wall", "右墙", [7.8, 0, -4], [0.28, 6.2, 28]),
    prop("wall_end", "wall", "尽头墙", [1, 0, 18.8], [16, 6.2, 0.3]),
    prop("col_l1", "column", "柱", [-4.8, 0, -12], [0.55, 5.4, 0.55]),
    prop("col_l2", "column", "柱", [-4.8, 0, -4], [0.55, 5.4, 0.55]),
    prop("col_l3", "column", "柱", [-4.8, 0, 4], [0.55, 5.4, 0.55]),
    prop("col_l4", "column", "柱", [-4.8, 0, 12], [0.55, 5.4, 0.55]),
    prop("col_r1", "column", "柱", [5.2, 0, -10], [0.55, 5.4, 0.55]),
    prop("col_r2", "column", "柱", [5.2, 0, -2], [0.55, 5.4, 0.55]),
    prop("col_r3", "column", "柱", [5.2, 0, 10], [0.55, 5.4, 0.55]),
    prop("crate_side_l", "furniture", "侧垛", [-4.4, 0, -8], [1.4, 1.6, 1.3]),
    prop("crate_side_r", "furniture", "侧垛", [4.6, 0, -6], [1.3, 1.4, 1.2]),
    prop("crate_hero", "furniture", "目标货箱", [0.12, 0, 8.55], [1.45, 1.72, 1.2]),
    prop("crate_hero_stack", "furniture", "货箱", [1.35, 0, 8.7], [1.0, 1.1, 1.0]),
    prop("lamp_1", "prop", "顶灯", [-2.0, 0, -10], [0.3, 4.8, 0.3]),
    prop("lamp_2", "prop", "顶灯", [-2.0, 0, 0], [0.3, 4.8, 0.3]),
    prop("lamp_3", "prop", "顶灯", [-2.0, 0, 9], [0.3, 4.8, 0.3]),
  ],
};

const cameraSetup: CameraSetup = {
  placement: {
    relativeTo: { type: "world", position: CAM_PATH[0] },
  },
  orientation: {
    lookAt: { target: { type: "entity", entityId: "person_a" }, anchor: "eyes" },
  },
  lens: { focalLength: 85 },
  framing: { target: "person_a", shotSize: "close" },
};

export const ONER_PROMPT =
  "20 秒一镜：特写慢慢拉开后焦距锁定。人再走近时只拉远物距，不改焦距。最后升高，停在侧后方高机位。";

export function onerBeat(time: number): string {
  if (time < 5) return "0–5s  面部特写，慢慢拉开";
  if (time < 12) return "5–12s  前方倒退，人物逐渐变小";
  if (time < 14) return "12–14s  焦距锁定 · 人走近则相机后退";
  if (time < 18) return "14–18s  升高，慢慢绕到侧后方";
  return "18–20s  高机位侧后方停住";
}

export function stationOner(): ThreeDkerShotDocument {
  return {
    dsl: "3dker",
    version: "1.0",
    kind: "shot",
    scene: WAREHOUSE_SCENE,
    initialState: {
      entities: [{ entityId: "person_a", visibility: true }],
      camera: cameraSetup,
    },
    entityMotion: {
      duration: DURATION,
      tracks: [
        {
          entityId: "person_a",
          duration: DURATION,
          operators: [
            {
              id: "walk_to_crate",
              type: "path",
              timing: { start: 0, duration: DURATION, profile: "linear" },
              parameters: {
                geometry: { interpolation: "catmull_rom", points: A_PATH },
                locomotion: "walk",
              },
            },
          ],
        },
      ],
    },
    cameraShot: {
      id: "warehouse_oner",
      duration: DURATION,
      cameraSetup,
      operators: [
        {
          id: "cam_path",
          type: "path",
          timing: { start: 0, duration: DURATION, profile: "linear" },
          parameters: {
            geometry: { interpolation: "catmull_rom", points: CAM_PATH },
            resolution: "snapshot",
          },
        },
        {
          id: "look_a",
          type: "look_at",
          timing: { start: 0, duration: DURATION },
          target: { type: "entity", entityId: "person_a", anchor: "eyes" },
        },
        {
          id: "open_up",
          type: "zoom",
          timing: { start: 0, duration: 12, profile: "ease_in_out" },
          parameters: { from: 85, to: 42 },
        },
      ],
      constraints: [
        { type: "collision", mode: "warn" },
        { type: "visibility", mode: "warn" },
        { type: "framing", mode: "clamp", parameters: { from: 12, hold: "distance" } },
      ],
      locks: { target: true, framing: true },
    },
  };
}
