import type { CameraOperator, EntityOperator, ThreeDkerShotDocument } from "@semantic-director/dsl-core";
import { CAMERA_PRIMITIVES, ENTITY_PRIMITIVES, HITCHCOCK_RECIPE } from "@semantic-director/dsl-core";
import { hitchcockOperators } from "./recipes";
import { DUSK_PROMPT, duskLivingOner } from "./livingRoom";
import { ONER_PROMPT, stationOner } from "./oner";
import { DEFAULT_CAMERA, emptyMotion, shotDoc } from "./station";

export interface OperatorBench {
  id: string;
  group: "camera" | "entity" | "recipe";
  primitive: string;
  title: string;
  intent: string;
  duration: number;
  document: ThreeDkerShotDocument;
}

const lookA: CameraOperator = {
  id: "look_a",
  type: "look_at",
  timing: { start: 0, duration: 5 },
  target: { type: "entity", entityId: "person_a", anchor: "chest" },
};

function cam(id: string, title: string, intent: string, ops: CameraOperator[], duration = 5): OperatorBench {
  return {
    id,
    group: "camera",
    primitive: ops.find((op) => op.id === id)?.type ?? ops[0]?.type ?? id,
    title,
    intent,
    duration,
    document: shotDoc(id, duration, ops),
  };
}

function entityTrack(ops: EntityOperator[], duration = 5): ThreeDkerShotDocument["entityMotion"] {
  return { duration, tracks: [{ entityId: "person_a", duration, operators: ops }] };
}

export const CAMERA_BENCHES: OperatorBench[] = [
  cam("static", "固定", "摄像机停在人物正前方，不移动。", [
    { id: "static", type: "static", timing: { start: 0, duration: 5 } },
    { ...lookA, timing: { start: 0, duration: 5 } },
  ]),
  cam("translate", "位移", "沿摄像机前方推进 2 米。覆盖 Dolly / Truck / Pedestal 的线性位移。", [
    {
      id: "translate",
      type: "translate",
      timing: { start: 0, duration: 5, profile: "ease_in_out" },
      parameters: { direction: "forward", distance: 2, space: "camera" },
    },
    { ...lookA, timing: { start: 0, duration: 5 } },
  ]),
  cam("rotate", "旋转", "绕 yaw 甩 55°，对应 Pan。pitch/roll 走同一算子。", [
    {
      id: "rotate",
      type: "rotate",
      timing: { start: 1, duration: 0.6, profile: "burst", strength: 1 },
      parameters: { axis: "yaw", angle: 55 },
    },
  ]),
  cam("orbit", "环绕", "绕人物胸部顺时针 120°。", [
    {
      id: "orbit",
      type: "orbit",
      timing: { start: 0, duration: 5, profile: "cinematic", strength: 0.8 },
      target: { type: "entity", entityId: "person_a", anchor: "chest" },
      parameters: { angle: 120, direction: "clockwise" },
    },
    { ...lookA, timing: { start: 0, duration: 5 } },
  ]),
  {
    id: "follow",
    group: "camera",
    primitive: "follow",
    title: "跟随",
    intent: "人物沿站台跑，摄像机保持左后方 3 米。",
    duration: 6,
    document: shotDoc(
      "follow",
      6,
      [
        {
          id: "follow",
          type: "follow",
          timing: { start: 0, duration: 6 },
          target: { type: "entity", entityId: "person_a" },
          parameters: { region: "back_left", distance: 3 },
        },
        { ...lookA, id: "look_follow", timing: { start: 0, duration: 6 } },
      ],
      entityTrack(
        [
          {
            id: "run",
            type: "move_to",
            timing: { start: 0, duration: 6, profile: "accelerate", strength: 0.4 },
            parameters: {
              destination: { relativeTo: { type: "zone", zoneId: "platform_end" } },
              locomotion: "run",
            },
          },
        ],
        6,
      ),
      {
        ...DEFAULT_CAMERA,
        placement: {
          relativeTo: { type: "entity", entityId: "person_a", anchor: "root" },
          region: "back_left",
          distance: 3,
          height: { relativeTo: { type: "entity", entityId: "person_a", anchor: "waist" }, offset: -0.1 },
        },
      },
    ),
  },
  {
    id: "attach",
    group: "camera",
    primitive: "attach",
    title: "绑定",
    intent: "绑在人物头部前方，类似头盔机 / Snorricam。",
    duration: 5,
    document: shotDoc(
      "attach",
      5,
      [
        {
          id: "attach",
          type: "attach",
          timing: { start: 0, duration: 5 },
          target: { type: "entity", entityId: "person_a", anchor: "head" },
          parameters: { offset: [0.08, 0.12, 0.28] },
        },
        {
          id: "look_forward",
          type: "look_at",
          timing: { start: 0, duration: 5 },
          target: { type: "entity", entityId: "person_b", anchor: "chest" },
        },
      ],
      entityTrack(
        [
          {
            id: "walk",
            type: "translate",
            timing: { start: 0, duration: 5 },
            parameters: { direction: "forward", distance: 4, space: "local" },
          },
        ],
        5,
      ),
    ),
  },
  cam("path", "路径", "走一条三维样条，兜底复杂轨迹。", [
    {
      id: "path",
      type: "path",
      timing: { start: 0, duration: 5, profile: "ease_in_out" },
      parameters: {
        geometry: {
          interpolation: "catmull_rom",
          points: [
            [2.4, 1.2, 3.2],
            [0.6, 1.8, 2.0],
            [-1.4, 2.4, 0.4],
            [-0.2, 1.4, -2.2],
          ],
        },
        resolution: "snapshot",
      },
    },
    { ...lookA, timing: { start: 0, duration: 5 } },
  ]),
  cam("look_at", "看向", "只写旋转：始终看向人物胸部。", [
    { id: "look_at", type: "look_at", timing: { start: 0, duration: 5 }, target: { type: "entity", entityId: "person_a", anchor: "chest" } },
  ]),
  cam("zoom", "变焦", "焦距 35mm → 85mm，机位不动。", [
    {
      id: "zoom",
      type: "zoom",
      timing: { start: 0, duration: 5, profile: "ease_in_out" },
      parameters: { from: 35, to: 85 },
    },
    { ...lookA, timing: { start: 0, duration: 5 } },
  ]),
  cam("noise", "手持", "在固定机位上叠 handheld 扰动。", [
    { id: "hold", type: "static", timing: { start: 0, duration: 5 } },
    {
      id: "noise",
      type: "noise",
      timing: { start: 0, duration: 5 },
      parameters: { preset: "handheld", strength: 0.55 },
    },
    { ...lookA, timing: { start: 0, duration: 5 } },
  ]),
  cam("stabilize", "稳定", "先手持，后半段 stabilize 把扰动压回去。", [
    { id: "hold", type: "static", timing: { start: 0, duration: 6 } },
    {
      id: "noise",
      type: "noise",
      timing: { start: 0, duration: 6 },
      parameters: { preset: "handheld", strength: 0.7 },
    },
    {
      id: "stabilize",
      type: "stabilize",
      timing: { start: 3, duration: 3, profile: "ease_in" },
      parameters: { strength: 1 },
    },
    { ...lookA, timing: { start: 0, duration: 6 } },
  ], 6),
];

export const ENTITY_BENCHES: OperatorBench[] = [
  {
    id: "entity_static",
    group: "entity",
    primitive: "static",
    title: "人物静止",
    intent: "人物保持站姿，摄像机固定看他。",
    duration: 4,
    document: shotDoc(
      "entity_static",
      4,
      [lookA],
      entityTrack([{ id: "entity_static", type: "static", timing: { start: 0, duration: 4 } }], 4),
    ),
  },
  {
    id: "entity_translate",
    group: "entity",
    primitive: "translate",
    title: "人物平移",
    intent: "人物沿本地前方走 4 米。",
    duration: 5,
    document: shotDoc(
      "entity_translate",
      5,
      [
        {
          id: "follow_walk",
          type: "follow",
          timing: { start: 0, duration: 5 },
          target: { type: "entity", entityId: "person_a" },
          parameters: { region: "front", distance: 3.2 },
        },
        lookA,
      ],
      entityTrack(
        [
          {
            id: "entity_translate",
            type: "translate",
            timing: { start: 0, duration: 5, profile: "linear" },
            parameters: { direction: "forward", distance: 4, space: "local" },
          },
        ],
        5,
      ),
    ),
  },
  {
    id: "entity_move_to",
    group: "entity",
    primitive: "move_to",
    title: "走到区域",
    intent: "人物从原点跑到站台尽头。",
    duration: 6,
    document: shotDoc(
      "entity_move_to",
      6,
      [
        {
          id: "follow_run",
          type: "follow",
          timing: { start: 0, duration: 6 },
          target: { type: "entity", entityId: "person_a" },
          parameters: { region: "back_left", distance: 3 },
        },
        { ...lookA, timing: { start: 0, duration: 6 } },
      ],
      entityTrack(
        [
          {
            id: "entity_move_to",
            type: "move_to",
            timing: { start: 0, duration: 6, profile: "accelerate", strength: 0.45 },
            parameters: {
              destination: { relativeTo: { type: "zone", zoneId: "platform_end" } },
              locomotion: "run",
            },
          },
        ],
        6,
      ),
    ),
  },
  {
    id: "entity_rotate",
    group: "entity",
    primitive: "rotate",
    title: "人物转向",
    intent: "原地 yaw 180°。",
    duration: 4,
    document: shotDoc(
      "entity_rotate",
      4,
      [lookA],
      entityTrack(
        [
          {
            id: "entity_rotate",
            type: "rotate",
            timing: { start: 0, duration: 4, profile: "ease_in_out" },
            parameters: { axis: "yaw", angle: 180 },
          },
        ],
        4,
      ),
    ),
  },
  {
    id: "entity_path",
    group: "entity",
    primitive: "path",
    title: "人物路径",
    intent: "沿站台绕柱走一条样条。",
    duration: 6,
    document: shotDoc(
      "entity_path",
      6,
      [
        {
          id: "follow_path",
          type: "follow",
          timing: { start: 0, duration: 6 },
          target: { type: "entity", entityId: "person_a" },
          parameters: { region: "right", distance: 2.6 },
        },
        { ...lookA, timing: { start: 0, duration: 6 } },
      ],
      entityTrack(
        [
          {
            id: "entity_path",
            type: "path",
            timing: { start: 0, duration: 6, profile: "ease_in_out" },
            parameters: {
              geometry: {
                interpolation: "catmull_rom",
                points: [
                  [0, 0, 0],
                  [1.2, 0, 2.4],
                  [0.2, 0, 5.2],
                  [-1.1, 0, 7.4],
                ],
              },
            },
          },
        ],
        6,
      ),
    ),
  },
  {
    id: "entity_follow",
    group: "entity",
    primitive: "follow",
    title: "人物跟随",
    intent: "B 跟着 A 跑，摄像机看两人。",
    duration: 6,
    document: {
      ...shotDoc(
        "entity_follow",
        6,
        [
          {
            id: "orbit_pair",
            type: "orbit",
            timing: { start: 0, duration: 6 },
            target: { type: "entity", entityId: "person_a", anchor: "chest" },
            parameters: { angle: 80, direction: "clockwise" },
          },
          { ...lookA, timing: { start: 0, duration: 6 } },
        ],
        {
          duration: 6,
          tracks: [
            {
              entityId: "person_a",
              duration: 6,
              operators: [
                {
                  id: "lead",
                  type: "move_to",
                  timing: { start: 0, duration: 6 },
                  parameters: { destination: { relativeTo: { type: "zone", zoneId: "platform_end" } } },
                },
              ],
            },
            {
              entityId: "person_b",
              duration: 6,
              operators: [
                {
                  id: "entity_follow",
                  type: "follow",
                  timing: { start: 0, duration: 6 },
                  target: { type: "entity", entityId: "person_a" },
                  parameters: { region: "back_right", distance: 1.6 },
                },
              ],
            },
          ],
        },
      ),
    },
  },
  {
    id: "entity_attach",
    group: "entity",
    primitive: "attach",
    title: "道具绑定",
    intent: "把长椅当成被绑物体，贴到人物腰侧。",
    duration: 5,
    document: {
      ...shotDoc("entity_attach", 5, [
        {
          id: "side_follow",
          type: "follow",
          timing: { start: 0, duration: 5 },
          target: { type: "entity", entityId: "person_a" },
          parameters: { region: "left", distance: 3 },
        },
        lookA,
      ]),
      entityMotion: {
        duration: 5,
        tracks: [
          {
            entityId: "person_a",
            duration: 5,
            operators: [
              {
                id: "carry_walk",
                type: "translate",
                timing: { start: 0, duration: 5 },
                parameters: { direction: "forward", distance: 3.5, space: "local" },
              },
            ],
          },
          {
            entityId: "bench_01",
            duration: 5,
            operators: [
              {
                id: "entity_attach",
                type: "attach",
                timing: { start: 0, duration: 5 },
                target: { type: "entity", entityId: "person_a", anchor: "waist" },
                parameters: { offset: [0.45, 0.1, 0.1] },
              },
            ],
          },
        ],
      },
    },
  },
  {
    id: "entity_face_target",
    group: "entity",
    primitive: "face_target",
    title: "朝向目标",
    intent: "人物始终把身体转向 B。只写实体旋转。",
    duration: 5,
    document: shotDoc(
      "entity_face_target",
      5,
      [lookA],
      entityTrack(
        [
          {
            id: "entity_face_target",
            type: "face_target",
            timing: { start: 0, duration: 5 },
            target: { type: "entity", entityId: "person_b", anchor: "chest" },
          },
        ],
        5,
      ),
    ),
  },
  {
    id: "entity_pose",
    group: "entity",
    primitive: "pose",
    title: "姿态切换",
    intent: "running_ready → standing。",
    duration: 4,
    document: shotDoc(
      "entity_pose",
      4,
      [lookA],
      entityTrack(
        [
          {
            id: "entity_pose",
            type: "pose",
            timing: { start: 0, duration: 4, profile: "ease_out" },
            parameters: { from: "running_ready", to: "standing" },
          },
        ],
        4,
      ),
    ),
  },
  {
    id: "entity_state_change",
    group: "entity",
    primitive: "state_change",
    title: "状态切换",
    intent: "把 semanticState.alert 从 false 打到 true。",
    duration: 3,
    document: shotDoc(
      "entity_state_change",
      3,
      [lookA],
      entityTrack(
        [
          {
            id: "entity_state_change",
            type: "state_change",
            timing: { start: 0.5, duration: 1 },
            parameters: { key: "alert", from: false, to: true },
          },
        ],
        3,
      ),
    ),
  },
];

export const RECIPE_BENCHES: OperatorBench[] = [
  {
    id: "dusk",
    group: "recipe",
    primitive: "dusk",
    title: "傍晚客厅一镜",
    intent: DUSK_PROMPT,
    duration: 12,
    document: duskLivingOner(),
  },
  {
    id: "oner",
    group: "recipe",
    primitive: "oner",
    title: "20秒一镜到底",
    intent: ONER_PROMPT,
    duration: 20,
    document: stationOner(),
  },
  {
    id: "hitchcock",
    group: "recipe",
    primitive: HITCHCOCK_RECIPE.id,
    title: "希区柯克配方",
    intent: HITCHCOCK_RECIPE.meaning,
    duration: 5,
    document: shotDoc(
      "hitchcock",
      5,
      hitchcockOperators({
        targetId: "person_a",
        start: 0,
        duration: 5,
        direction: "in",
        distance: 1.8,
        fromFocal: 50,
        toFocal: 24,
      }),
      emptyMotion(5),
      { ...DEFAULT_CAMERA, lens: { focalLength: 50 }, framing: { target: "person_a", shotSize: "medium_close" } },
      { locks: { framing: true, target: true }, constraints: [{ type: "framing", mode: "clamp" }, { type: "collision", mode: "warn" }] },
    ),
  },
];

export const ALL_BENCHES: OperatorBench[] = [...CAMERA_BENCHES, ...ENTITY_BENCHES, ...RECIPE_BENCHES];

export function benchById(id: string): OperatorBench {
  const found = ALL_BENCHES.find((bench) => bench.id === id);
  if (!found) throw new Error(`Unknown bench: ${id}`);
  return found;
}

export function coverage() {
  const camera = new Set(CAMERA_BENCHES.map((bench) => bench.primitive));
  const entity = new Set(ENTITY_BENCHES.map((bench) => bench.primitive));
  return {
    cameraMissing: CAMERA_PRIMITIVES.filter((type) => !camera.has(type)),
    entityMissing: ENTITY_PRIMITIVES.filter((type) => !entity.has(type)),
    hitchcockIsRecipe: (ALL_BENCHES.find((b) => b.id === "hitchcock")?.document.cameraShot.operators ?? []).every(
      (op) => ["translate", "zoom", "look_at"].includes(op.type),
    ),
  };
}
