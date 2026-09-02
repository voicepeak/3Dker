import type { Vec3 } from "../types";
import { add, scale } from "./vec3";

export function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const a = scale(p0, -0.5 * t3 + t2 - 0.5 * t);
  const b = scale(p1, 1.5 * t3 - 2.5 * t2 + 1);
  const c = scale(p2, -1.5 * t3 + 2 * t2 + 0.5 * t);
  const d = scale(p3, 0.5 * t3 - 0.5 * t2);
  return add(add(a, b), add(c, d));
}

export function sampleCatmullRom(points: Vec3[], t: number): Vec3 {
  if (points.length === 0) return [0, 0, 0];
  if (points.length === 1) return points[0];
  const clamped = Math.min(1, Math.max(0, t));
  const segments = points.length - 1;
  const x = clamped * segments;
  const i = Math.min(Math.floor(x), segments - 1);
  const localT = x - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[Math.min(points.length - 1, i + 1)];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  return catmullRom(p0, p1, p2, p3, localT);
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
