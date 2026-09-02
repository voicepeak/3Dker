import type { Vec3 } from "@semantic-director/shared";

export interface SemanticAnchor {
  name: string;
  local: Vec3;
}

export const PROP_ANCHOR_NAMES = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "front",
  "back",
] as const;

export const PERSON_ANCHOR_NAMES = [
  "center",
  "head",
  "eyes",
  "chest",
  "waist",
  "feet",
  "shoulder_left",
  "shoulder_right",
] as const;

export type PropAnchorName = (typeof PROP_ANCHOR_NAMES)[number];
export type PersonAnchorName = (typeof PERSON_ANCHOR_NAMES)[number];
