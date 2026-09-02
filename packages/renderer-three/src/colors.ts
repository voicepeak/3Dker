import type { SemanticType } from "@semantic-director/shared";

export const ENTITY_COLORS: Record<SemanticType, number> = {
  person: 0xd9b18c,
  box: 0x8aa0b4,
  table: 0x6e4b32,
  vase: 0xc46b5a,
  wall: 0xb7c0c8,
  door: 0x4d6a7a,
};

export const ANCHOR_COLOR = 0xffcc66;
export const PATH_COLOR = 0x4cc9f0;
export const COLLISION_COLOR = 0xff4d6d;
export const LOOKAT_COLOR = 0xffffff;
