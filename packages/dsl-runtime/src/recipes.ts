import type { CameraOperator, CameraShot, Timing } from "@semantic-director/dsl-core";
import { HITCHCOCK_RECIPE } from "@semantic-director/dsl-core";

export interface HitchcockInput {
  targetId: string;
  start?: number;
  duration?: number;
  direction?: "in" | "out";
  distance?: number;
  fromFocal?: number;
  toFocal?: number;
  profile?: Timing["profile"];
  strength?: number;
}

export function hitchcockOperators(input: HitchcockInput): CameraOperator[] {
  const start = input.start ?? 0;
  const duration = input.duration ?? 4;
  const direction = input.direction ?? "in";
  const timing: Timing = {
    start,
    duration,
    profile: input.profile ?? "cinematic",
    strength: input.strength ?? 0.85,
  };
  const fromFocal = input.fromFocal ?? (direction === "in" ? 50 : 24);
  const toFocal = input.toFocal ?? (direction === "in" ? 24 : 50);
  return [
    {
      id: "hitchcock_translate",
      type: "translate",
      timing,
      parameters: {
        direction: direction === "in" ? "forward" : "backward",
        distance: input.distance ?? 1.8,
        space: "camera",
        recipe: HITCHCOCK_RECIPE.id,
      },
    },
    {
      id: "hitchcock_zoom",
      type: "zoom",
      timing,
      parameters: { from: fromFocal, to: toFocal, recipe: HITCHCOCK_RECIPE.id },
    },
    {
      id: "hitchcock_look",
      type: "look_at",
      timing,
      target: { type: "entity", entityId: input.targetId, anchor: "chest" },
      parameters: { recipe: HITCHCOCK_RECIPE.id },
    },
  ];
}

export function withHitchcock(shot: CameraShot, input: HitchcockInput): CameraShot {
  return {
    ...shot,
    operators: [...shot.operators, ...hitchcockOperators(input)],
    locks: { ...shot.locks, framing: true, target: true },
    constraints: [...(shot.constraints ?? []), { type: "framing", mode: "clamp" }],
  };
}
