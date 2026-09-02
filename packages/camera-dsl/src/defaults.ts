import type { CameraIntent } from "./schema";
import { cameraIntentSchema } from "./schema";

export function createDefaultIntent(id: string, targetEntityId: string): CameraIntent {
  return cameraIntentSchema.parse({
    id,
    motion: {
      type: "orbit",
      angle: 360,
      direction: "clockwise",
      startAzimuth: 0,
    },
    target: {
      entityId: targetEntityId,
      anchor: "chest",
    },
    lens: { focalLength: 35 },
    framing: { type: "medium" },
    composition: { screenX: 0.5, screenY: 0.5 },
    duration: 6,
    smoothness: 0.35,
  });
}
