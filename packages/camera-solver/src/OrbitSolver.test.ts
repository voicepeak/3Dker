import { describe, expect, it } from "vitest";
import { createDefaultIntent } from "@semantic-director/camera-dsl";
import { createEntity } from "@semantic-director/scene-core";
import { distance } from "@semantic-director/shared";
import { solveCamera } from "./Solver";
import { solveCameraDistance } from "./FramingSolver";
import { evaluateEntity } from "@semantic-director/scene-core";

describe("OrbitSolver", () => {
  it("keeps constant radius", () => {
    const person = createEntity("person", { position: [0, 0, 0] });
    const vase = createEntity("vase", { position: [1.2, 0, 0.4] });
    const intent = createDefaultIntent("cam", person.id);
    intent.height = { type: "anchor", entityId: vase.id, anchor: "top", priority: "soft" };
    intent.motion = { type: "orbit", angle: 360, direction: "clockwise", startAzimuth: 0 };
    intent.smoothness = 0;
    const result = solveCamera({ entities: [person, vase] }, intent);
    const first = result.samples[0];
    const radii = result.samples.map((s) =>
      Math.hypot(s.position[0] - 0, s.position[2] - 0),
    );
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    for (const r of radii) expect(Math.abs(r - mean) / mean).toBeLessThan(0.12);
    expect(first.position[1]).toBeCloseTo(vase.bounds.size[1], 1);
  });

  it("keeps requested height", () => {
    const person = createEntity("person");
    const vase = createEntity("vase", { position: [0.8, 0, 0.8] });
    vase.bounds.size = [0.22, 1.1, 0.22];
    vase.anchors.top = [0, 1.1, 0];
    const intent = createDefaultIntent("cam", person.id);
    intent.height = { type: "anchor", entityId: vase.id, anchor: "top", priority: "soft" };
    intent.smoothness = 0;
    const result = solveCamera({ entities: [person, vase] }, intent);
    for (const s of result.samples) {
      expect(s.position[1]).toBeCloseTo(1.1, 1);
    }
  });

  it("respects clockwise direction", () => {
    const person = createEntity("person");
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "orbit", angle: 90, direction: "clockwise", startAzimuth: 0 };
    const result = solveCamera({ entities: [person] }, intent);
    const a = result.samples[0].position;
    const b = result.samples[Math.floor(result.samples.length / 4)].position;
    const start = Math.atan2(a[2], a[0]);
    const next = Math.atan2(b[2], b[0]);
    let delta = next - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    expect(delta).toBeLessThan(0);
  });

  it("ends at expected angle", () => {
    const person = createEntity("person");
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "orbit", angle: 180, direction: "counter_clockwise", startAzimuth: 0 };
    const result = solveCamera({ entities: [person] }, intent);
    const a = result.samples[0].position;
    const b = result.samples[result.samples.length - 1].position;
    const start = Math.atan2(a[2], a[0]);
    const end = Math.atan2(b[2], b[0]);
    let delta = end - start;
    while (delta < 0) delta += Math.PI * 2;
    expect(delta).toBeCloseTo(Math.PI, 1);
  });
});

describe("FramingSolver", () => {
  it("moves camera farther for 85mm", () => {
    const person = createEntity("person");
    const target = evaluateEntity(person, 0);
    const d35 = solveCameraDistance({ target, focalLength: 35, framing: "medium" });
    const d85 = solveCameraDistance({ target, focalLength: 85, framing: "medium" });
    expect(d85).toBeGreaterThan(d35 * 1.5);
  });

  it("keeps target framing ratio", () => {
    const person = createEntity("person");
    const target = evaluateEntity(person, 0);
    const close = solveCameraDistance({ target, focalLength: 35, framing: "close" });
    const wide = solveCameraDistance({ target, focalLength: 35, framing: "wide" });
    expect(wide).toBeGreaterThan(close);
  });
});

describe("FollowSolver", () => {
  it("moves with the person", () => {
    const person = createEntity("person", { position: [0, 0, 0] });
    person.motionPath = {
      duration: 4,
      waypoints: [
        [0, 0, 0],
        [0, 0, 4],
      ],
    };
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "follow", offset: { side: "back_left" } };
    intent.duration = 4;
    const result = solveCamera({ entities: [person] }, intent);
    const start = result.samples[0].position;
    const end = result.samples[result.samples.length - 1].position;
    expect(end[2]).toBeGreaterThan(start[2] + 2);
    expect(distance(start, end)).toBeGreaterThan(2);
  });
});

describe("Collision", () => {
  it("flags wall hits on a dolly-in", () => {
    const person = createEntity("person", { position: [0, 0, 0] });
    const wall = createEntity("wall", { position: [0, 0, 2.6], rotation: [0, 0, 0] });
    wall.bounds.size = [6, 2.5, 0.3];
    const intent = createDefaultIntent("cam", person.id);
    intent.motion = { type: "dolly", direction: "in", startSide: "front", distance: 0.8 };
    intent.framing = { type: "medium_close" };
    intent.lens = { focalLength: 50 };
    intent.duration = 4;
    intent.smoothness = 0;
    const result = solveCamera({ entities: [person, wall] }, intent);
    expect(result.samples.some((s) => s.collision) || result.warnings.some((w) => w.kind === "collision")).toBe(
      true,
    );
  });
});
