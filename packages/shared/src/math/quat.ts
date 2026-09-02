import type { Quat, Vec3 } from "../types";
import { cross, dot, length, normalize, sub } from "./vec3";

export function quatIdentity(): Quat {
  return [0, 0, 0, 1];
}

export function lookAtQuat(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Quat {
  const z = normalize(sub(eye, target));
  let zLen = length(z);
  const zAxis: Vec3 = zLen < 1e-8 ? [0, 0, 1] : z;
  let xAxis = normalize(cross(up, zAxis));
  if (length(xAxis) < 1e-8) {
    const fallbackUp: Vec3 = Math.abs(zAxis[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0];
    xAxis = normalize(cross(fallbackUp, zAxis));
  }
  const yAxis = cross(zAxis, xAxis);
  return matrixToQuat(xAxis, yAxis, zAxis);
}

function matrixToQuat(x: Vec3, y: Vec3, z: Vec3): Quat {
  const m00 = x[0];
  const m01 = y[0];
  const m02 = z[0];
  const m10 = x[1];
  const m11 = y[1];
  const m12 = z[1];
  const m20 = x[2];
  const m21 = y[2];
  const m22 = z[2];
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}

export function quatDot(a: Quat, b: Quat): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

export function slerp(a: Quat, b: Quat, t: number): Quat {
  let ax = a[0];
  let ay = a[1];
  let az = a[2];
  let aw = a[3];
  let bx = b[0];
  let by = b[1];
  let bz = b[2];
  let bw = b[3];
  let cosTheta = ax * bx + ay * by + az * bz + aw * bw;
  if (cosTheta < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cosTheta = -cosTheta;
  }
  if (cosTheta > 0.9995) {
    return normalizeQuat([
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      aw + (bw - aw) * t,
    ]);
  }
  const theta = Math.acos(Math.min(1, cosTheta));
  const sinTheta = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;
  return [ax * w1 + bx * w2, ay * w1 + by * w2, az * w1 + bz * w2, aw * w1 + bw * w2];
}

export function normalizeQuat(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len < 1e-8) return quatIdentity();
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

export function rotateY(v: Vec3, yaw: number): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

export { dot };
