import { z } from "zod";

export const framingTypeSchema = z.enum([
  "extreme_wide",
  "wide",
  "full",
  "medium",
  "medium_close",
  "close",
]);

export const motionTypeSchema = z.enum(["static", "orbit", "dolly", "truck", "crane", "follow"]);

export const heightConstraintSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("absolute"),
    value: z.number(),
    priority: z.enum(["hard", "soft"]).default("soft"),
  }),
  z.object({
    type: z.literal("anchor"),
    entityId: z.string(),
    anchor: z.string(),
    priority: z.enum(["hard", "soft"]).default("soft"),
  }),
  z.object({
    type: z.literal("target_relative"),
    anchor: z.string(),
    priority: z.enum(["hard", "soft"]).default("soft"),
  }),
]);

export const orbitIntentSchema = z.object({
  type: z.literal("orbit"),
  targetEntityId: z.string().optional(),
  angle: z.number().default(360),
  direction: z.enum(["clockwise", "counter_clockwise"]).default("clockwise"),
  startAzimuth: z.number().default(0),
  startSide: z.enum(["front", "back", "left", "right"]).optional(),
});

export const dollyIntentSchema = z.object({
  type: z.literal("dolly"),
  direction: z.enum(["in", "out"]).default("in"),
  distance: z.number().optional(),
  startSide: z.enum(["front", "back", "left", "right"]).default("front"),
});

export const truckIntentSchema = z.object({
  type: z.literal("truck"),
  direction: z.enum(["left", "right"]).default("left"),
  distance: z.number().default(2),
  startSide: z.enum(["front", "back", "left", "right"]).default("front"),
});

export const craneIntentSchema = z.object({
  type: z.literal("crane"),
  direction: z.enum(["up", "down"]).default("up"),
  distance: z.number().default(1),
  startSide: z.enum(["front", "back", "left", "right"]).default("front"),
});

export const followIntentSchema = z.object({
  type: z.literal("follow"),
  offset: z.object({
    side: z.enum(["front", "back", "left", "right", "back_left", "back_right"]).default("back_left"),
    distance: z.number().optional(),
  }),
});

export const staticIntentSchema = z.object({
  type: z.literal("static"),
  startSide: z.enum(["front", "back", "left", "right"]).default("front"),
});

export const motionIntentSchema = z.discriminatedUnion("type", [
  staticIntentSchema,
  orbitIntentSchema,
  dollyIntentSchema,
  truckIntentSchema,
  craneIntentSchema,
  followIntentSchema,
]);

export const cameraIntentSchema = z.object({
  id: z.string(),
  motion: motionIntentSchema,
  target: z.object({
    entityId: z.string(),
    anchor: z.string().default("chest"),
  }),
  height: heightConstraintSchema.optional(),
  lens: z.object({
    focalLength: z.number().default(35),
    sensorHeight: z.number().optional(),
  }),
  framing: z.object({
    type: framingTypeSchema.default("medium"),
  }),
  composition: z
    .object({
      screenX: z.number().default(0.5),
      screenY: z.number().default(0.5),
    })
    .optional(),
  duration: z.number().positive().default(5),
  smoothness: z.number().min(0).max(1).default(0.35),
});

export type FramingType = z.infer<typeof framingTypeSchema>;
export type HeightConstraint = z.infer<typeof heightConstraintSchema>;
export type MotionIntent = z.infer<typeof motionIntentSchema>;
export type CameraIntent = z.infer<typeof cameraIntentSchema>;
export type OrbitIntent = z.infer<typeof orbitIntentSchema>;
export type DollyIntent = z.infer<typeof dollyIntentSchema>;
export type TruckIntent = z.infer<typeof truckIntentSchema>;
export type CraneIntent = z.infer<typeof craneIntentSchema>;
export type FollowIntent = z.infer<typeof followIntentSchema>;
export type StaticIntent = z.infer<typeof staticIntentSchema>;
