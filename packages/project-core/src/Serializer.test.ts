import { describe, expect, it } from "vitest";
import { solveCamera } from "@semantic-director/camera-solver";
import { demoA } from "./demos";
import { deserializeProject, serializeProject } from "./Serializer";

describe("Project serialization", () => {
  it("roundtrips Demo A and keeps solve results stable", () => {
    const original = demoA();
    const json = serializeProject(original);
    const loaded = deserializeProject(json);
    expect(loaded.scene.entities).toHaveLength(original.scene.entities.length);
    const a = solveCamera(original.scene, original.cameraIntents[0]);
    const b = solveCamera(loaded.scene, loaded.cameraIntents[0]);
    expect(a.samples.length).toBe(b.samples.length);
    expect(a.samples[0].position[0]).toBeCloseTo(b.samples[0].position[0], 6);
    expect(a.samples[a.samples.length - 1].position[2]).toBeCloseTo(
      b.samples[b.samples.length - 1].position[2],
      6,
    );
  });
});
