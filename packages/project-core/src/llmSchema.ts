import { framingTypeSchema, motionIntentSchema } from "@semantic-director/camera-dsl";
import { z } from "zod";

export const sideSchema = z.enum(["front", "back", "left", "right", "back_left", "back_right"]);
export const semanticTypeSchema = z.enum(["person", "box", "table", "vase", "wall", "door"]);

export const sceneOpSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("clear"),
  }),
  z.object({
    kind: z.literal("upsert"),
    type: semanticTypeSchema,
    name: z.string().min(1).optional(),
    at: z.enum(["origin"]).optional(),
    relative: z
      .object({
        ofType: semanticTypeSchema.optional(),
        ofName: z.string().optional(),
        side: sideSchema,
        distance: z.number().positive().max(20).optional(),
      })
      .optional(),
  }),
  z.object({
    kind: z.literal("path"),
    ofType: semanticTypeSchema.optional(),
    ofName: z.string().optional(),
    side: sideSchema.default("front"),
    distance: z.number().positive().max(20).default(4),
    duration: z.number().min(0.5).max(60).default(6),
  }),
]);

export const scenePlanSchema = z.object({
  ops: z.array(sceneOpSchema).min(1).max(12),
});

export const cameraPlanSchema = z.object({
  motion: motionIntentSchema,
  target: z.object({
    entityId: z.string().optional(),
    entityName: z.string().optional(),
    entityType: semanticTypeSchema.optional(),
    anchor: z.string().default("chest"),
  }),
  height: z
    .object({
      entityId: z.string().optional(),
      entityName: z.string().optional(),
      entityType: semanticTypeSchema.optional(),
      anchor: z.string().default("top"),
    })
    .nullable()
    .optional(),
  lens: z.object({
    focalLength: z.number().min(12).max(200).default(35),
  }),
  framing: z.object({
    type: framingTypeSchema.default("medium"),
  }),
  duration: z.number().min(0.5).max(60).default(6),
});

export type ScenePlan = z.infer<typeof scenePlanSchema>;
export type CameraPlan = z.infer<typeof cameraPlanSchema>;
export type LlmSceneOp = z.infer<typeof sceneOpSchema>;
