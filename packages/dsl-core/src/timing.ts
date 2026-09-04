import type { Timing, TimingProfile } from "./types";

export type CubicBezier = [number, number, number, number];

export const TIMING_PRESETS: Record<TimingProfile, CubicBezier> = {
  linear: [0, 0, 1, 1],
  ease_in: [0.42, 0, 1, 1],
  ease_out: [0, 0, 0.58, 1],
  ease_in_out: [0.42, 0, 0.58, 1],
  accelerate: [0.55, 0, 0.9, 0.15],
  decelerate: [0.15, 0.7, 0.35, 1],
  burst: [0.12, 0.92, 0.2, 1],
  cinematic: [0.4, 0, 0.2, 1],
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function sampleBezier(s: number, a: number, b: number): number {
  const u = 1 - s;
  return 3 * u * u * s * a + 3 * u * s * s * b + s * s * s;
}

function sampleBezierDerivative(s: number, a: number, b: number): number {
  const u = 1 - s;
  return 3 * u * u * a + 6 * u * s * (b - a) + 3 * s * s * (1 - b);
}

export function cubicBezierProgress(t: number, bezier: CubicBezier): number {
  const x = clamp(t, 0, 1);
  const [x1, y1, x2, y2] = bezier;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (Math.abs(x1 - y1) < 1e-8 && Math.abs(x2 - y2) < 1e-8) return x;
  let s = x;
  for (let i = 0; i < 12; i++) {
    const current = sampleBezier(s, x1, x2);
    const ds = sampleBezierDerivative(s, x1, x2);
    if (Math.abs(current - x) < 1e-6) break;
    if (Math.abs(ds) < 1e-6) break;
    s = clamp(s - (current - x) / ds, 0, 1);
  }
  return clamp(sampleBezier(s, y1, y2), 0, 1);
}

export function resolveTimingBezier(timing: Timing): CubicBezier {
  if (timing.bezier) return timing.bezier;
  const preset = TIMING_PRESETS[timing.profile ?? "linear"];
  const strength = clamp(timing.strength ?? 1, 0, 1);
  return [
    0 + (preset[0] - 0) * strength,
    0 + (preset[1] - 0) * strength,
    1 + (preset[2] - 1) * strength,
    1 + (preset[3] - 1) * strength,
  ];
}

export function operatorWindow(timing: Timing): { start: number; end: number } {
  return { start: timing.start, end: timing.start + Math.max(timing.duration, 1e-6) };
}

export function isOperatorActive(timing: Timing, time: number): boolean {
  const { start, end } = operatorWindow(timing);
  return time >= start && time < end;
}

export function settledProgress(timing: Timing, time: number): number {
  const { start, end } = operatorWindow(timing);
  if (time <= start) return 0;
  if (time >= end) return 1;
  return cubicBezierProgress((time - start) / (end - start), resolveTimingBezier(timing));
}

export function evalTime(timing: Timing, time: number): number {
  const { start, end } = operatorWindow(timing);
  if (time < start) return start;
  if (time >= end) return Math.max(start, end - 1e-6);
  return time;
}
