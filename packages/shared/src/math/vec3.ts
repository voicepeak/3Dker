import type { Vec3 } from "../types";

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return [x, y, z];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function lengthSq(a: Vec3): number {
  return dot(a, a);
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (len < 1e-8) return [0, 0, 0];
  return scale(a, 1 / len);
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function clone(a: Vec3): Vec3 {
  return [a[0], a[1], a[2]];
}

export function equals(a: Vec3, b: Vec3, eps = 1e-6): boolean {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps && Math.abs(a[2] - b[2]) < eps;
}

export function setY(a: Vec3, y: number): Vec3 {
  return [a[0], y, a[2]];
}

export function xz(a: Vec3): [number, number] {
  return [a[0], a[2]];
}

export function horizontal(a: Vec3): Vec3 {
  return [a[0], 0, a[2]];
}
