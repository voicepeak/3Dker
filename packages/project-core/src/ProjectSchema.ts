import { cameraIntentSchema } from "@semantic-director/camera-dsl";
import type { CameraIntent } from "@semantic-director/camera-dsl";
import type { SceneEntity } from "@semantic-director/scene-core";
import { z } from "zod";

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  semanticType: z.enum(["person", "box", "table", "vase", "wall", "door"]),
  transform: z.object({
    position: vec3Schema,
    rotation: vec3Schema,
    scale: vec3Schema,
  }),
  bounds: z.object({
    size: vec3Schema,
  }),
  anchors: z.record(z.string(), vec3Schema),
  motionPath: z
    .object({
      waypoints: z.array(vec3Schema).min(1),
      duration: z.number().positive(),
    })
    .optional(),
});

export const projectSchema = z.object({
  version: z.literal("0.1"),
  name: z.string().default("Untitled"),
  scene: z.object({
    entities: z.array(entitySchema),
  }),
  actors: z.array(z.string()).default([]),
  cameraIntents: z.array(cameraIntentSchema),
  activeIntentId: z.string().optional(),
  playback: z.object({
    duration: z.number().positive().default(6),
  }),
});

export type ProjectFile = z.infer<typeof projectSchema>;

export interface ProjectState {
  version: "0.1";
  name: string;
  scene: { entities: SceneEntity[] };
  actors: string[];
  cameraIntents: CameraIntent[];
  activeIntentId?: string;
  playback: { duration: number };
}
