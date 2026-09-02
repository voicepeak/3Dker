import { describe, expect, it } from "vitest";
import { createDefaultIntent } from "@semantic-director/camera-dsl";
import { createEntity } from "@semantic-director/scene-core";
import { solveCamera } from "./Solver";

function sceneWithPerson() {
  const person = createEntity("person", { position: [0, 0, 0] });
  return { person, scene: { entities: [person] } };
}

describe("Static / Dolly / Truck / Crane", () => {
  it("static look-at stays put", () => {
    const { person, scene } = sceneWithPerson();
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "static", startSide: "front" };
    intent.smoothness = 0;
    const result = solveCamera(scene, intent);
    const a = result.samples[0].position;
    const b = result.samples[result.samples.length - 1].position;
    expect(a[0]).toBeCloseTo(b[0], 5);
    expect(a[2]).toBeCloseTo(b[2], 5);
  });

  it("dolly in reduces distance", () => {
    const { person, scene } = sceneWithPerson();
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "dolly", direction: "in", startSide: "front", distance: 1.2 };
    intent.smoothness = 0;
    const result = solveCamera(scene, intent);
    const start = result.samples[0].position;
    const end = result.samples[result.samples.length - 1].position;
    const d0 = Math.hypot(start[0], start[2]);
    const d1 = Math.hypot(end[0], end[2]);
    expect(d1).toBeLessThan(d0 * 0.8);
  });

  it("truck moves laterally while looking at target", () => {
    const { person, scene } = sceneWithPerson();
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "truck", direction: "left", distance: 3, startSide: "front" };
    intent.smoothness = 0;
    const result = solveCamera(scene, intent);
    const start = result.samples[0].position;
    const end = result.samples[result.samples.length - 1].position;
    expect(Math.hypot(end[0] - start[0], end[2] - start[2])).toBeGreaterThan(2);
  });

  it("crane up changes height", () => {
    const { person, scene } = sceneWithPerson();
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "crane", direction: "up", distance: 1.5, startSide: "front" };
    intent.smoothness = 0;
    const result = solveCamera(scene, intent);
    const start = result.samples[0].position;
    const end = result.samples[result.samples.length - 1].position;
    expect(end[1]).toBeGreaterThan(start[1] + 1);
  });
});
