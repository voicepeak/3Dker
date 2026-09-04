import { lookAtQuat, normalize, rotateY, slerp, type Vec3 } from "@semantic-director/shared";
import type { EulerRotation, Quaternion } from "@semantic-director/dsl-core";

export function quatIdentity(): Quaternion {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function quatFromTuple(q: [number, number, number, number]): Quaternion {
  return { x: q[0], y: q[1], z: q[2], w: q[3] };
}

export function quatToTuple(q: Quaternion): [number, number, number, number] {
  return [q.x, q.y, q.z, q.w];
}

export function eulerToQuat(euler: EulerRotation = {}): Quaternion {
  const yaw = ((euler.yaw ?? 0) * Math.PI) / 180;
  const pitch = ((euler.pitch ?? 0) * Math.PI) / 180;
  const roll = ((euler.roll ?? 0) * Math.PI) / 180;
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  return {
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
    w: cr * cp * cy + sr * sp * sy,
  };
}

export function quatMul(a: Quaternion, b: Quaternion): Quaternion {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function rotateByQuat(q: Quaternion, v: Vec3): Vec3 {
  const u: Vec3 = [q.x, q.y, q.z];
  const t: Vec3 = [
    2 * (u[1] * v[2] - u[2] * v[1]),
    2 * (u[2] * v[0] - u[0] * v[2]),
    2 * (u[0] * v[1] - u[1] * v[0]),
  ];
  return [
    v[0] + q.w * t[0] + (u[1] * t[2] - u[2] * t[1]),
    v[1] + q.w * t[1] + (u[2] * t[0] - u[0] * t[2]),
    v[2] + q.w * t[2] + (u[0] * t[1] - u[1] * t[0]),
  ];
}

export function viewForward(q: Quaternion): Vec3 {
  return normalize(rotateByQuat(q, [0, 0, -1]));
}

export function viewRight(q: Quaternion): Vec3 {
  return normalize(rotateByQuat(q, [1, 0, 0]));
}

export function viewUp(q: Quaternion): Vec3 {
  return normalize(rotateByQuat(q, [0, 1, 0]));
}

export function yawOfQuat(q: Quaternion): number {
  const f = viewForward(q);
  return Math.atan2(f[0], f[2]);
}

export function headingOfQuat(q: Quaternion): number {
  const f = rotateByQuat(q, [0, 0, 1]);
  return Math.atan2(f[0], f[2]);
}

export function lookRotation(eye: Vec3, target: Vec3): Quaternion {
  return quatFromTuple(lookAtQuat(eye, target));
}

export function quatSlerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
  return quatFromTuple(slerp(quatToTuple(a), quatToTuple(b), t));
}

export function axisAngleQuat(axis: Vec3, angleRad: number): Quaternion {
  const h = angleRad * 0.5;
  const s = Math.sin(h);
  const n = normalize(axis);
  return { x: n[0] * s, y: n[1] * s, z: n[2] * s, w: Math.cos(h) };
}

export function headingQuat(yawRad: number): Quaternion {
  return eulerToQuat({ yaw: (yawRad * 180) / Math.PI });
}

export function localAxes(yawRad: number): { forward: Vec3; right: Vec3; up: Vec3 } {
  return {
    forward: rotateY([0, 0, 1], yawRad),
    right: rotateY([1, 0, 0], yawRad),
    up: [0, 1, 0],
  };
}

export function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scaleVec(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function subVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function lengthVec(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function horizontalDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function asVec3(value: unknown, fallback: Vec3): Vec3 {
  if (Array.isArray(value) && value.length >= 3 && value.every((n) => typeof n === "number")) {
    return [value[0], value[1], value[2]];
  }
  return fallback;
}
