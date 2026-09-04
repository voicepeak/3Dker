export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface EulerRotation {
  yaw?: number;
  pitch?: number;
  roll?: number;
}

export type EntityId = string;
export type ZoneId = string;
export type OperatorId = string;

export interface EntityTarget {
  type: "entity";
  entityId: EntityId;
  anchor?: string;
}

export interface ZoneTarget {
  type: "zone";
  zoneId: ZoneId;
}

export interface WorldTarget {
  type: "world";
  position: Vec3;
}

export interface BetweenTarget {
  type: "between";
  a: EntityId | ZoneId;
  b: EntityId | ZoneId;
  ratio?: number;
}

export type SpatialTarget = EntityTarget | ZoneTarget | WorldTarget | BetweenTarget;

export type Region =
  | "front"
  | "back"
  | "left"
  | "right"
  | "front_left"
  | "front_right"
  | "back_left"
  | "back_right"
  | "above"
  | "below"
  | "inside"
  | "outside";

export interface HeightReference {
  absolute?: number;
  relativeTo?: EntityTarget | ZoneTarget;
  offset?: number;
}

export interface SpatialReference {
  relativeTo: SpatialTarget;
  region?: Region;
  distance?: number;
  height?: HeightReference;
  offset?: Vec3;
}

export type TimingProfile =
  | "linear"
  | "ease_in"
  | "ease_out"
  | "ease_in_out"
  | "accelerate"
  | "decelerate"
  | "burst"
  | "cinematic";

export interface Timing {
  start: number;
  duration: number;
  profile?: TimingProfile;
  strength?: number;
  bezier?: [number, number, number, number];
}

export type ConstraintMode = "warn" | "clamp" | "fail";

export interface EntityConstraint {
  type: "ground" | "collision" | "keep_distance" | "face_target" | "stay_in_zone" | "max_speed" | "max_acceleration";
  parameters?: Record<string, unknown>;
  mode?: ConstraintMode;
}

export interface CameraConstraint {
  type: "target" | "framing" | "height" | "visibility" | "collision";
  parameters?: Record<string, unknown>;
  mode?: ConstraintMode;
}

export interface CameraLocks {
  path?: boolean;
  timing?: boolean;
  lens?: boolean;
  target?: boolean;
  framing?: boolean;
  orientation?: boolean;
}

export type CameraPrimitive =
  | "static"
  | "translate"
  | "rotate"
  | "orbit"
  | "follow"
  | "attach"
  | "path"
  | "look_at"
  | "zoom"
  | "noise"
  | "stabilize";

export type EntityPrimitive =
  | "static"
  | "translate"
  | "move_to"
  | "rotate"
  | "path"
  | "follow"
  | "attach"
  | "face_target"
  | "pose"
  | "state_change";

export interface SceneZone {
  id: ZoneId;
  shape: { type: "box"; center: Vec3; size: Vec3 } | { type: "polygon"; points: Vec3[] };
  tags?: string[];
}

export interface SceneEntity {
  id: EntityId;
  type:
    | "person"
    | "vehicle"
    | "prop"
    | "furniture"
    | "architecture"
    | "terrain"
    | "door"
    | "window"
    | "column"
    | "wall"
    | "platform"
    | "train"
    | "camera_marker"
    | "empty";
  semantic?: string;
  geometry?: {
    type: "box" | "mesh";
    size?: Vec3;
    assetId?: string;
    bounds?: Vec3;
  };
  transform: {
    position?: Vec3;
    rotation?: EulerRotation;
    scale?: Vec3;
    placement?: SpatialReference;
  };
  anchors?: Array<{
    id: string;
    position: Vec3 | { normalizedBBox: Vec3 };
    semantic?: string;
  }>;
  tags?: string[];
  physical?: {
    collision?: boolean;
    occluder?: boolean;
    walkable?: boolean;
  };
}

export interface SpatialRelation {
  subject: EntityId;
  relation: "left_of" | "right_of" | "in_front_of" | "behind" | "near" | "far" | "inside" | "between" | "facing";
  object: EntityId | ZoneId;
  value?: number;
}

export interface Scene {
  id: string;
  world: {
    origin: Vec3;
    upAxis: "Y";
    forwardAxis: "Z";
    unit: "meter";
    handedness: "right";
  };
  zones?: SceneZone[];
  entities: SceneEntity[];
  relations?: SpatialRelation[];
  navigation?: {
    walkableZones?: ZoneId[];
    blockedEntities?: EntityId[];
  };
  metadata?: Record<string, unknown>;
}

export interface EntityState {
  entityId: EntityId;
  transform?: {
    position?: Vec3;
    rotation?: EulerRotation | Quaternion;
    placement?: SpatialReference;
  };
  pose?: {
    preset?: "standing" | "walking_ready" | "running_ready" | "sitting" | "crouching" | "lying" | "aiming" | "looking_back";
    facing?: SpatialTarget;
    bodyOrientation?: EulerRotation;
  };
  semanticState?: Record<string, string | number | boolean>;
  visibility?: boolean;
}

export interface CameraSetup {
  placement: SpatialReference;
  orientation: {
    lookAt?: { target: SpatialTarget; anchor?: string };
    rotation?: EulerRotation;
    forward?: Vec3;
    roll?: number;
  };
  lens: {
    focalLength: number;
    sensorWidth?: number;
    aperture?: number;
    focusTarget?: EntityTarget;
  };
  framing?: {
    target?: EntityId | EntityId[];
    shotSize?: "extreme_close" | "close" | "medium_close" | "medium" | "medium_full" | "full" | "wide";
    screenPosition?: Vec2;
  };
}

export interface InitialWorldState {
  entities: EntityState[];
  camera: CameraSetup;
}

export interface EntityOperator {
  id: OperatorId;
  type: EntityPrimitive;
  timing: Timing;
  target?: EntityTarget;
  parameters?: Record<string, unknown>;
}

export interface EntityMotionTrack {
  entityId: EntityId;
  duration: number;
  operators: EntityOperator[];
  constraints?: EntityConstraint[];
}

export interface EntityMotionPlan {
  duration: number;
  tracks: EntityMotionTrack[];
}

export interface CameraOperator {
  id: OperatorId;
  type: CameraPrimitive;
  timing: Timing;
  target?: EntityTarget;
  parameters?: Record<string, unknown>;
}

export interface CameraShot {
  id: string;
  duration: number;
  cameraSetup: CameraSetup;
  operators: CameraOperator[];
  constraints?: CameraConstraint[];
  locks?: CameraLocks;
}

export interface EntityRuntimeState {
  entityId: EntityId;
  time: number;
  position: Vec3;
  rotation: Quaternion;
  pose?: Record<string, unknown>;
  semanticState?: Record<string, unknown>;
  visibility: boolean;
}

export interface CameraRuntimeState {
  time: number;
  position: Vec3;
  rotation: Quaternion;
  focalLength: number;
}

export interface Diagnostic {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
  entityId?: EntityId;
  operatorId?: OperatorId;
  timeRange?: [number, number];
}

export interface ThreeDkerShotDocument {
  dsl: "3dker";
  version: "1.0";
  kind: "shot";
  scene: Scene;
  initialState: InitialWorldState;
  entityMotion: EntityMotionPlan;
  cameraShot: CameraShot;
}

export interface RecipeNote {
  id: string;
  name: string;
  meaning: string;
  expandsTo: string[];
}
