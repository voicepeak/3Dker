export const SAMPLE_FPS = 30;
export const CAMERA_COLLISION_RADIUS = 0.15;
export const DEFAULT_SENSOR_HEIGHT_MM = 24;
export const MIN_CAMERA_DISTANCE = 0.35;
export const MIN_ORBIT_RADIUS = 0.3;

export const FRAMING_RATIO = {
  extreme_wide: 0.2,
  wide: 0.35,
  full: 0.7,
  medium: 0.55,
  medium_close: 0.7,
  close: 0.85,
} as const;

export const PERSON_ANCHORS = {
  feet: [0, 0, 0],
  waist: [0, 0.9, 0],
  chest: [0, 1.25, 0],
  eyes: [0, 1.65, 0],
  head: [0, 1.75, 0],
  shoulder_left: [-0.22, 1.45, 0],
  shoulder_right: [0.22, 1.45, 0],
  center: [0, 0.9, 0],
} as const;
