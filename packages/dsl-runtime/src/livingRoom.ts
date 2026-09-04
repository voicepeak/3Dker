import type { CameraSetup, Scene, SceneEntity, ThreeDkerShotDocument, Vec3 } from "@semantic-director/dsl-core";

const DURATION = 12;

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
  [0.04, 0, 0.7],
  [0.06, 0, 1.7],
  [0.08, 0, 2.55],
  [0.08, 0, 2.62],
  [0.08, 0, 2.62],
  [0.08, 0, 2.62],
  [0.18, 0, 3.7],
  [0.28, 0, 4.85],
  [0.32, 0, 5.05],
];

const CAM_PATH: Vec3[] = [
  [0.22, 1.18, -1.95],
  [0.58, 1.24, -0.15],
  [0.95, 1.32, 1.15],
  [1.18, 1.4, 2.2],
  [1.34, 1.48, 2.9],
  [1.48, 1.52, 3.22],
  [1.52, 1.54, 3.28],
];

export const LIVING_ROOM_SCENE: Scene = {
  id: "dusk_living_room",
  world: { origin: [0, 0, 0], upAxis: "Y", forwardAxis: "Z", unit: "meter", handedness: "right" },
  entities: [
    {
      id: "person_a",
      type: "person",
      semantic: "女人",
      geometry: { type: "box", size: [0.48, 1.68, 0.32] },
      transform: { position: A_PATH[0], rotation: { yaw: 0 } },
      anchors: [
        { id: "root", position: [0, 0, 0] },
        { id: "waist", position: [0, 0.9, 0] },
        { id: "chest", position: [0, 1.22, 0] },
        { id: "head", position: [0, 1.56, 0] },
        { id: "eyes", position: [0, 1.54, 0.07] },
      ],
      physical: { collision: true, occluder: false },
    },
    prop("floor_01", "platform", "木地板", [0, -0.04, 2.9], [5.2, 0.08, 6.4]),
    prop("wall_door", "wall", "门墙", [0, 0, -0.35], [5.2, 2.75, 0.12]),
    prop("wall_window", "wall", "窗墙", [0, 0, 6.12], [5.2, 2.75, 0.12]),
    prop("wall_l", "wall", "左墙", [-2.58, 0, 2.9], [0.1, 2.75, 6.4]),
    prop("wall_r", "wall", "右墙", [2.58, 0, 2.9], [0.1, 2.75, 6.4]),
    prop("ceiling_01", "architecture", "天花", [0, 2.72, 2.9], [5.2, 0.06, 6.4]),
    prop("door_01", "door", "门", [0, 0, -0.3], [0.95, 2.1, 0.08]),
    prop("window_01", "window", "窗", [0.1, 1.2, 6.08], [1.9, 1.6, 0.06]),
    prop("curtain_l", "prop", "暖色窗帘", [-1.15, 1.22, 5.98], [0.58, 2.2, 0.08]),
    prop("curtain_r", "prop", "暖色窗帘", [1.35, 1.22, 5.98], [0.58, 2.2, 0.08]),
    prop("sofa_01", "furniture", "沙发", [-1.55, 0, 2.7], [1.6, 0.72, 0.82]),
    prop("table_01", "furniture", "茶几", [-0.7, 0, 2.7], [0.72, 0.38, 0.72]),
    prop("cabinet_01", "furniture", "矮柜", [-1.7, 0, 5.45], [1.25, 0.52, 0.38]),
    prop("shelf_01", "furniture", "边柜", [2.05, 0, 1.05], [0.42, 0.7, 0.9]),
    prop("rug_01", "prop", "地毯", [-0.45, 0, 2.75], [2.2, 0.03, 1.9]),
  ],
};

const cameraSetup: CameraSetup = {
  placement: { relativeTo: { type: "world", position: CAM_PATH[0] } },
  orientation: {
    lookAt: { target: { type: "entity", entityId: "person_a" }, anchor: "chest" },
  },
  lens: { focalLength: 24 },
  framing: { target: "person_a", shotSize: "medium_full" },
};

export const DUSK_PROMPT =
  "傍晚小户型客厅。门在身后、窗在正前方。女人从门口缓步入室，中场停两三秒，再走向窗边望向窗外。相机退后起幅，沿右侧轻弧推进十二秒：24mm 胸高中景 → 32mm 眼高中近景，人偏右，留出客厅空间。";

export function duskBeat(time: number): string {
  if (time < 4.5) return "0–4.5s  门口退后 24mm · 正背中景，右侧轻弧";
  if (time < 7) return "4.5–7s  中场停下，只呼吸，不转头";
  if (time < 10) return "7–10s  继续走向窗边";
  return "10–12s  32mm 眼高中近景 · 右侧留白看窗";
}

export function duskLivingOner(): ThreeDkerShotDocument {
  return {
    dsl: "3dker",
    version: "1.0",
    kind: "shot",
    scene: LIVING_ROOM_SCENE,
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
              id: "walk_in",
              type: "path",
              timing: { start: 0, duration: DURATION, profile: "ease_in_out" },
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
      id: "dusk_living_oner",
      duration: DURATION,
      cameraSetup,
      operators: [
        {
          id: "right_arc",
          type: "path",
          timing: { start: 0, duration: DURATION, profile: "ease_in_out" },
          parameters: {
            geometry: { interpolation: "catmull_rom", points: CAM_PATH },
            resolution: "snapshot",
          },
        },
        {
          id: "look_a",
          type: "look_at",
          timing: { start: 0, duration: DURATION },
          target: { type: "entity", entityId: "person_a", anchor: "chest" },
        },
        {
          id: "to_35",
          type: "zoom",
          timing: { start: 0, duration: DURATION, profile: "ease_in_out" },
          parameters: { from: 24, to: 32 },
        },
      ],
      constraints: [
        { type: "collision", mode: "warn" },
        { type: "visibility", mode: "warn" },
      ],
      locks: { target: true },
    },
  };
}
