import { describe, expect, it } from "vitest";
import { solveCamera } from "@semantic-director/camera-solver";
import { demoA, demoB, demoC } from "./demos";

describe("MVP demos", () => {
  it("Demo A orbits at vase height without keyframes", () => {
    const project = demoA();
    const result = solveCamera(project.scene, project.cameraIntents[0]);
    expect(result.samples.length).toBeGreaterThan(30);
    const vase = project.scene.entities.find((e) => e.id === "vase_01")!;
    for (const sample of result.samples) {
      expect(sample.position[1]).toBeCloseTo(vase.bounds.size[1], 1);
    }
    const start = Math.atan2(result.samples[0].position[2], result.samples[0].position[0]);
    const end = Math.atan2(
      result.samples[result.samples.length - 1].position[2],
      result.samples[result.samples.length - 1].position[0],
    );
    let delta = end - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    expect(Math.abs(Math.abs(delta) < 0.3 ? Math.PI * 2 : Math.abs(delta))).toBeGreaterThan(5);

    vase.transform.position = [0.9, 0, 0.55];
    vase.bounds.size = [0.22, 0.9, 0.22];
    vase.anchors.top = [0, 0.9, 0];
    const raised = solveCamera(project.scene, project.cameraIntents[0]);
    expect(raised.samples[0].position[1]).toBeCloseTo(0.9, 1);
  });

  it("Demo B reports a wall collision instead of silently going through", () => {
    const project = demoB();
    const result = solveCamera(project.scene, project.cameraIntents[0]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.kind === "collision")).toBe(true);
    expect(result.samples.some((s) => s.collision)).toBe(true);
  });

  it("Demo C follow keeps framing while the person walks", () => {
    const project = demoC();
    const result = solveCamera(project.scene, project.cameraIntents[0]);
    const start = result.samples[0].position;
    const end = result.samples[result.samples.length - 1].position;
    expect(end[2]).toBeGreaterThan(start[2] + 2);
    const radii = result.samples.map((s, i) => {
      const t = (i / (result.samples.length - 1)) * project.cameraIntents[0].duration;
      const personZ = t < 3 ? -2 + (2.5 + 2) * (t / 6) : 2.5;
      return Math.hypot(s.position[0], s.position[2] - personZ);
    });
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(8);
  });
});
