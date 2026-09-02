import type { FramingType } from "@semantic-director/camera-dsl";
import {
  DEFAULT_SENSOR_HEIGHT_MM,
  FRAMING_RATIO,
  MIN_CAMERA_DISTANCE,
} from "@semantic-director/shared";
import type { EvaluatedEntity } from "@semantic-director/scene-core";

export function verticalFovRad(focalLengthMm: number, sensorHeightMm = DEFAULT_SENSOR_HEIGHT_MM): number {
  return 2 * Math.atan(sensorHeightMm / (2 * focalLengthMm));
}

export function framingSubjectHeight(target: EvaluatedEntity): number {
  if (target.entity.semanticType === "person") {
    return target.size[1] * target.scale[1];
  }
  return Math.max(target.size[1] * target.scale[1], 0.3);
}

export function solveCameraDistance(input: {
  target: EvaluatedEntity;
  focalLength: number;
  framing: FramingType;
  sensorHeight?: number;
}): number {
  const H = framingSubjectHeight(input.target);
  const p = FRAMING_RATIO[input.framing];
  const fov = verticalFovRad(input.focalLength, input.sensorHeight);
  const distance = H / (2 * p * Math.tan(fov / 2));
  return Math.max(distance, MIN_CAMERA_DISTANCE);
}

export function startAzimuthFromSide(side?: "front" | "back" | "left" | "right", yaw = 0): number {
  const offsets = {
    front: Math.PI / 2,
    back: -Math.PI / 2,
    left: 0,
    right: Math.PI,
  };
  return yaw + (side ? offsets[side] : Math.PI / 2);
}
