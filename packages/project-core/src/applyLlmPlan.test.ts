import { describe, expect, it } from "vitest";
import { cameraIntentSchema } from "@semantic-director/camera-dsl";
import { createEntity } from "@semantic-director/scene-core";
import { applyCameraPlan, applyScenePlan } from "./applyLlmPlan";

describe("applyScenePlan", () => {
  it("places a person and a vase to the right", () => {
    const result = applyScenePlan(
      {
        ops: [
          { kind: "upsert", type: "person", at: "origin" },
          { kind: "upsert", type: "vase", relative: { ofType: "person", side: "right", distance: 0.9 } },
        ],
      },
      [],
    );
    const person = result.entities.find((e) => e.semanticType === "person");
    const vase = result.entities.find((e) => e.semanticType === "vase");
    expect(person).toBeTruthy();
    expect(vase?.transform.position[0]).toBeGreaterThan(0.4);
  });
});

describe("applyCameraPlan", () => {
  it("binds orbit intent to the person chest and vase height", () => {
    const person = createEntity("person", { name: "人物", position: [0, 0, 0] });
    const vase = createEntity("vase", { name: "花瓶", position: [1, 0, 0] });
    const intent = cameraIntentSchema.parse({
      id: "cam",
      motion: { type: "static", startSide: "front" },
      target: { entityId: person.id, anchor: "chest" },
      lens: { focalLength: 35 },
      framing: { type: "medium" },
      duration: 5,
    });
    const result = applyCameraPlan(
      {
        motion: { type: "orbit", angle: 360, direction: "clockwise", startAzimuth: 0 },
        target: { entityType: "person", anchor: "chest" },
        height: { entityType: "vase", anchor: "top" },
        lens: { focalLength: 35 },
        framing: { type: "medium" },
        duration: 6,
      },
      [person, vase],
      intent,
    );
    expect(result.intent.motion.type).toBe("orbit");
    expect(result.intent.target.entityId).toBe(person.id);
    expect(result.intent.height?.type).toBe("anchor");
    if (result.intent.height?.type === "anchor") expect(result.intent.height.entityId).toBe(vase.id);
  });
});
