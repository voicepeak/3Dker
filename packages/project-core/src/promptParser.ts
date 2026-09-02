import type { CameraIntent, FramingType, MotionIntent } from "@semantic-director/camera-dsl";
import { cameraIntentSchema } from "@semantic-director/camera-dsl";
import { createEntity, type SceneEntity } from "@semantic-director/scene-core";
import type { SemanticType, Vec3 } from "@semantic-director/shared";

export type Side = "front" | "back" | "left" | "right" | "back_left" | "back_right";

export interface PlacementOp {
  kind: "upsert";
  type: SemanticType;
  name?: string;
  position?: Vec3;
  relative?: { ofType?: SemanticType; ofName?: string; side: Side; distance?: number };
}

export interface PathOp {
  kind: "path";
  ofType?: SemanticType;
  ofName?: string;
  side: Side;
  distance: number;
  duration: number;
}

export interface ClearOp {
  kind: "clear";
}

export type SceneOp = PlacementOp | PathOp | ClearOp;

export interface ParsedPrompt {
  ops: SceneOp[];
  motion?: MotionIntent;
  targetType?: SemanticType;
  targetName?: string;
  targetAnchor?: string;
  heightType?: SemanticType;
  heightName?: string;
  heightAnchor?: string;
  focalLength?: number;
  framing?: FramingType;
  duration?: number;
  logs: string[];
}

const TYPE_PATTERNS: [RegExp, SemanticType][] = [
  [/花瓶|瓶/, "vase"],
  [/人物|人偶/, "person"],
  [/桌子|餐桌|茶几|桌面|桌/, "table"],
  [/墙壁|墙/, "wall"],
  [/大门|房门/, "door"],
  [/箱子|盒子|立方体/, "box"],
];

const ANCHOR_PATTERNS: [RegExp, string][] = [
  [/胸口|胸部|胸/, "chest"],
  [/眼睛|眼/, "eyes"],
  [/头部|头顶|头/, "head"],
  [/腰部|腰/, "waist"],
  [/脚底|脚/, "feet"],
  [/顶部|顶/, "top"],
  [/中心|中央/, "center"],
];

const FRAMING_PATTERNS: [RegExp, FramingType][] = [
  [/大远景/, "extreme_wide"],
  [/中近景/, "medium_close"],
  [/近景|特写/, "close"],
  [/远景/, "wide"],
  [/全身|全景/, "full"],
  [/中景/, "medium"],
];

const SIDE_OFFSET: Record<Side, Vec3> = {
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

function allTypes(text: string): SemanticType[] {
  const found: SemanticType[] = [];
  for (const [re, type] of TYPE_PATTERNS) {
    if (re.test(text) && !found.includes(type)) found.push(type);
  }
  if (!found.includes("person") && /人物|人偶|一个人/.test(text)) found.push("person");
  return found;
}

function matchAnchor(text: string): string | undefined {
  for (const [re, name] of ANCHOR_PATTERNS) {
    if (re.test(text)) return name;
  }
  return undefined;
}

function matchSide(text: string): Side | undefined {
  if (/左后方/.test(text)) return "back_left";
  if (/右后方/.test(text)) return "back_right";
  if (/左前方/.test(text)) return "left";
  if (/右前方/.test(text)) return "right";
  if (/右侧|右边|之右/.test(text)) return "right";
  if (/左侧|左边|之左/.test(text)) return "left";
  if (/正前方|前方|前面|之前/.test(text)) return "front";
  if (/正后方|后方|后面|背后|之后/.test(text)) return "back";
  return undefined;
}

function matchFraming(text: string): FramingType | undefined {
  for (const [re, type] of FRAMING_PATTERNS) {
    if (re.test(text)) return type;
  }
  return undefined;
}

function numberBefore(text: string, unit: RegExp): number | undefined {
  const match = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${unit.source})`));
  return match ? Number(match[1]) : undefined;
}

function splitClauses(text: string): string[] {
  return text
    .split(/[\n。；;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isCameraClause(text: string): boolean {
  return /摄像|镜头|环绕|围绕|推进|推近|拉远|横移|跟随|跟着|摇臂|升降|焦距|景别|毫米|mm|看向|机位/.test(text);
}

function isPlaceClause(text: string): boolean {
  return /放|摆|加|创建|布置|生成|摆一|放一|墙上/.test(text) || /场景/.test(text);
}

function cameraStartSide(side?: Side): "front" | "back" | "left" | "right" {
  if (side === "back_left" || side === "left") return "left";
  if (side === "back_right" || side === "right") return "right";
  if (side === "back") return "back";
  return "front";
}

function parseMotion(text: string): MotionIntent | undefined {
  const angle = numberBefore(text, /度|°/);
  const startSide = cameraStartSide(matchSide(text.replace(/看向.*/, "")));
  const clockwise = /逆时针|反时针/.test(text) ? "counter_clockwise" : "clockwise";

  if (/跟随|跟着|跟拍/.test(text)) {
    const followSide = matchSide(text.replace(/看向.*/, "")) ?? "back_left";
    return { type: "follow", offset: { side: followSide === "left" ? "back_left" : followSide } };
  }
  if (/环绕|围绕|转一圈|绕/.test(text)) {
    return {
      type: "orbit",
      angle: angle ?? 360,
      direction: clockwise,
      startAzimuth: 0,
      startSide,
    };
  }
  if (/拉远|拉镜头|后退/.test(text)) {
    return { type: "dolly", direction: "out", startSide: startSide ?? "front" };
  }
  if (/推进|推近|推镜头|推向/.test(text)) {
    return { type: "dolly", direction: "in", startSide: startSide ?? "front" };
  }
  if (/横移|平移/.test(text) || /左移|右移/.test(text)) {
    const dir = /右/.test(text) ? "right" : "left";
    return { type: "truck", direction: dir, distance: numberBefore(text, /米|m/) ?? 2, startSide: startSide ?? "front" };
  }
  if (/升起|升镜头|上摇|升高/.test(text)) {
    return { type: "crane", direction: "up", distance: numberBefore(text, /米|m/) ?? 1, startSide: startSide ?? "front" };
  }
  if (/降下|降镜头|下摇|降低/.test(text)) {
    return { type: "crane", direction: "down", distance: numberBefore(text, /米|m/) ?? 1, startSide: startSide ?? "front" };
  }
  if (/固定|静止|锁定|不移动/.test(text)) {
    return { type: "static", startSide: startSide ?? "front" };
  }
  return undefined;
}

export function parseDirectorPrompt(text: string): ParsedPrompt {
  const logs: string[] = [];
  const ops: SceneOp[] = [];
  const parsed: ParsedPrompt = { ops, logs };
  const source = text.trim();
  if (!source) {
    logs.push("提示词为空");
    return parsed;
  }
  if (/清空|重置场景|新场景/.test(source)) {
    ops.push({ kind: "clear" });
    logs.push("清空场景");
  }

  let lastPlaced: SemanticType | undefined;
  for (const clause of splitClauses(source.replace(/，/g, "。"))) {
    if (isPlaceClause(clause) || /原点|中间|左右|前方放|后方放|更前|更后/.test(clause)) {
      const afterPlace = clause.split(/放|摆|加|创建|布置|生成/).slice(1).join("放");
      const beforePlace = clause.split(/放|摆|加|创建|布置|生成/)[0] ?? clause;
      const placedTypes = allTypes(afterPlace || clause);
      const types = placedTypes.length ? placedTypes : allTypes(clause);
      const side = matchSide(clause) ?? (/更前|更后/.test(clause) ? "front" : undefined);
      const distance = numberBefore(clause, /米|m/);
      for (const type of types) {
        const relativeHost = allTypes(beforePlace).find((t) => t !== type) ?? lastPlaced;
        if (relativeHost && side) {
          const hostAlready = ops.some((op) => op.kind === "upsert" && op.type === relativeHost);
          if (!hostAlready) {
            ops.push({ kind: "upsert", type: relativeHost, position: [0, 0, 0] });
            logs.push(`布置${relativeHost}：原点`);
          }
          ops.push({
            kind: "upsert",
            type,
            relative: { ofType: relativeHost, side, distance: distance ?? DEFAULT_GAP[type] },
          });
          logs.push(`布置${type}：相对${relativeHost}的${side}`);
        } else if (/原点|中间|中心/.test(clause) || type === "person") {
          ops.push({ kind: "upsert", type, position: [0, 0, 0] });
          logs.push(`布置${type}：原点`);
        } else if (side) {
          const gap = distance ?? DEFAULT_GAP[type] ?? 1;
          const dir = SIDE_OFFSET[side];
          ops.push({
            kind: "upsert",
            type,
            position: [dir[0] * gap, 0, dir[2] * gap],
          });
          logs.push(`布置${type}：${side}`);
        } else {
          ops.push({ kind: "upsert", type, position: [1, 0, 0.6] });
          logs.push(`布置${type}`);
        }
        lastPlaced = type;
      }
    }

    if (/走|移动|路径|向前/.test(clause) && /人物|人/.test(clause)) {
      const side = matchSide(clause) ?? "front";
      const distance = numberBefore(clause, /米|m/) ?? 4;
      const duration = numberBefore(clause, /秒|s/) ?? 6;
      ops.push({ kind: "path", ofType: "person", side, distance, duration });
      logs.push("人物沿路径移动");
    }

    if (isCameraClause(clause) || parseMotion(clause) || matchFraming(clause) || /mm|毫米|看向|高度/.test(clause)) {
      const motion = parseMotion(clause);
      if (motion) parsed.motion = motion;
      const framing = matchFraming(clause);
      if (framing) parsed.framing = framing;
      const focal = numberBefore(clause, /mm|毫米/);
      if (focal) parsed.focalLength = focal;
      const duration = numberBefore(clause, /秒|s/);
      if (duration) parsed.duration = duration;
      const look = matchAnchor(clause);
      if (look && /看向|对准|目标/.test(clause)) parsed.targetAnchor = look;
      const types = allTypes(clause);
      if (/看向|对准/.test(clause) && types[0]) parsed.targetType = types[0];
      if (/高度/.test(clause)) {
        parsed.heightAnchor = matchAnchor(clause) ?? "top";
        parsed.heightType = types.find((t) => t !== "person") ?? types[0];
      }
      if (/人物|人/.test(clause) && /环绕|围绕|跟随|推进|看向/.test(clause)) {
        parsed.targetType = parsed.targetType ?? "person";
      }
    }
  }

  if (!parsed.motion && parseMotion(source)) parsed.motion = parseMotion(source);
  if (!parsed.framing) parsed.framing = matchFraming(source);
  if (parsed.focalLength === undefined) parsed.focalLength = numberBefore(source, /mm|毫米/);
  if (parsed.duration === undefined) parsed.duration = numberBefore(source, /秒|s/);
  if (!parsed.targetAnchor && /看向/.test(source)) parsed.targetAnchor = matchAnchor(source);
  if (!parsed.heightType && /高度/.test(source)) {
    parsed.heightAnchor = matchAnchor(source) ?? "top";
    parsed.heightType = allTypes(source).find((t) => t !== "person");
  }
  if (!parsed.targetType && /人物/.test(source) && (parsed.motion || /看向/.test(source))) {
    parsed.targetType = "person";
  }
  if (!ops.length && !parsed.motion && !parsed.framing && parsed.focalLength === undefined) {
    logs.push("未识别到布置或运镜指令");
  }
  return parsed;
}

function findEntity(entities: SceneEntity[], type?: SemanticType, name?: string): SceneEntity | undefined {
  if (name) {
    const byName = entities.find((e) => e.name === name || e.name.includes(name));
    if (byName) return byName;
  }
  if (type) return entities.find((e) => e.semanticType === type);
  return undefined;
}

function addOffset(base: Vec3, side: Side, distance: number): Vec3 {
  const dir = SIDE_OFFSET[side];
  return [base[0] + dir[0] * distance, 0, base[2] + dir[2] * distance];
}

export interface PromptContext {
  entities: SceneEntity[];
  intent: CameraIntent;
}

export interface AppliedPrompt {
  entities: SceneEntity[];
  intent: CameraIntent;
  logs: string[];
}

export function applyDirectorPrompt(text: string, ctx: PromptContext): AppliedPrompt {
  const parsed = parseDirectorPrompt(text);
  let entities = ctx.entities.map((e) => ({ ...e, transform: { ...e.transform, position: [...e.transform.position] as Vec3 } }));
  for (const op of parsed.ops) {
    if (op.kind === "clear") {
      entities = [];
      continue;
    }
    if (op.kind === "upsert") {
      let position = op.position ?? [0, 0, 0];
      if (op.relative) {
        const host = findEntity(entities, op.relative.ofType, op.relative.ofName);
        if (host) {
          position = addOffset(host.transform.position, op.relative.side, op.relative.distance ?? DEFAULT_GAP[op.type]);
        } else {
          const created = createEntity(op.relative.ofType ?? "person", { position: [0, 0, 0] });
          entities.push(created);
          parsed.logs.push(`自动补了${created.name}`);
          position = addOffset(created.transform.position, op.relative.side, op.relative.distance ?? DEFAULT_GAP[op.type]);
        }
      }
      const existing = findEntity(entities, op.type, op.name);
      if (existing) {
        existing.transform = { ...existing.transform, position };
      } else {
        entities.push(createEntity(op.type, { position, name: op.name }));
      }
    }
    if (op.kind === "path") {
      const person = findEntity(entities, op.ofType ?? "person", op.ofName);
      if (person) {
        const start = person.transform.position;
        const end = addOffset(start, op.side, op.distance);
        const mid = addOffset(start, op.side, op.distance * 0.5);
        person.motionPath = { duration: op.duration, waypoints: [start, mid, end] };
      }
    }
  }

  const target =
    findEntity(entities, parsed.targetType, parsed.targetName) ??
    findEntity(entities, "person") ??
    entities[0];
  const heightHost = findEntity(entities, parsed.heightType, parsed.heightName);

  const nextIntent = cameraIntentSchema.parse({
    ...ctx.intent,
    motion: parsed.motion ?? ctx.intent.motion,
    target: {
      entityId: target?.id ?? ctx.intent.target.entityId,
      anchor: parsed.targetAnchor ?? ctx.intent.target.anchor,
    },
    height: heightHost
      ? { type: "anchor", entityId: heightHost.id, anchor: parsed.heightAnchor ?? "top", priority: "soft" }
      : ctx.intent.height,
    lens: { focalLength: parsed.focalLength ?? ctx.intent.lens.focalLength },
    framing: { type: parsed.framing ?? ctx.intent.framing.type },
    duration: parsed.duration ?? ctx.intent.duration,
  });

  return { entities, intent: nextIntent, logs: parsed.logs };
}
