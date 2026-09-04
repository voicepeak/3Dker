import { describe, expect, it } from "vitest";
import { CAMERA_PRIMITIVES, ENTITY_PRIMITIVES } from "@semantic-director/dsl-core";
import { ALL_BENCHES, coverage } from "./benches";
import { hitchcockOperators } from "./recipes";
import { sampleDocument, solveDocument } from "./solveDocument";

describe("operator bench coverage", () => {
  it("covers every camera and entity primitive", () => {
    const report = coverage();
    expect(report.cameraMissing).toEqual([]);
    expect(report.entityMissing).toEqual([]);
    expect(report.hitchcockIsRecipe).toBe(true);
  });

  it("has one bench per primitive plus hitchcock recipe", () => {
    expect(ALL_BENCHES.filter((b) => b.group === "camera")).toHaveLength(CAMERA_PRIMITIVES.length);
    expect(ALL_BENCHES.filter((b) => b.group === "entity")).toHaveLength(ENTITY_PRIMITIVES.length);
    expect(ALL_BENCHES.some((b) => b.id === "hitchcock")).toBe(true);
    expect(ALL_BENCHES.some((b) => b.id === "oner")).toBe(true);
    expect(ALL_BENCHES.some((b) => b.id === "dusk")).toBe(true);
  });
});

describe("hitchcock recipe", () => {
  it("expands to translate + zoom + look_at, never dolly_zoom", () => {
    const ops = hitchcockOperators({ targetId: "person_a" });
    expect(ops.map((op) => op.type).sort()).toEqual(["look_at", "translate", "zoom"]);
  });

  it("keeps subject size by dropping focal length as the camera pushes in", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "hitchcock")!;
    const start = solveDocument(bench.document, 0).camera;
    const end = solveDocument(bench.document, 5).camera;
    const dist = (cam: typeof start) => Math.hypot(cam.position[0], cam.position[2]);
    expect(dist(end)).toBeLessThan(dist(start) - 1);
    expect(end.focalLength).toBeLessThan(start.focalLength - 8);
  });
});

describe("primitive motion", () => {
  it("orbit sweeps more than 90 degrees", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "orbit")!;
    const a = solveDocument(bench.document, 0).camera.position;
    const b = solveDocument(bench.document, 5).camera.position;
    const az = (p: typeof a) => Math.atan2(p[0], p[2]);
    let delta = az(b) - az(a);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    expect(Math.abs(delta)).toBeGreaterThan((90 * Math.PI) / 180);
  });

  it("zoom changes focal length without requiring a dolly_zoom type", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "zoom")!;
    const start = solveDocument(bench.document, 0).camera;
    const end = solveDocument(bench.document, 5).camera;
    expect(end.focalLength).toBeGreaterThan(start.focalLength + 30);
    expect(Math.hypot(end.position[0] - start.position[0], end.position[2] - start.position[2])).toBeLessThan(0.2);
  });

  it("entity move_to actually relocates person_a", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "entity_move_to")!;
    const start = solveDocument(bench.document, 0).entities.person_a.position;
    const end = solveDocument(bench.document, 6).entities.person_a.position;
    expect(end[2]).toBeGreaterThan(start[2] + 4);
  });

  it("samples deterministically", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "translate")!;
    const a = sampleDocument(bench.document, 12);
    const b = sampleDocument(bench.document, 12);
    expect(a[4].camera.position).toEqual(b[4].camera.position);
  });

  it("rejects dolly_zoom as a primitive", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "static")!;
    const doc = {
      ...bench.document,
      cameraShot: {
        ...bench.document.cameraShot,
        operators: [
          {
            id: "bad",
            type: "dolly_zoom" as unknown as "static",
            timing: { start: 0, duration: 2 },
            parameters: { direction: "in", strength: 0.8 },
          },
        ],
      },
    };
    const result = solveDocument(doc, 1);
    expect(result.diagnostics.some((d) => d.code === "E_UNSUPPORTED_OPERATOR")).toBe(true);
  });

  it("oner stays on A and the camera path is continuous", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "oner")!;
    expect(bench.document.cameraShot.operators.filter((op) => op.type === "look_at")).toHaveLength(1);
    expect(bench.document.cameraShot.operators.find((op) => op.type === "look_at")?.target?.entityId).toBe("person_a");
    const start = solveDocument(bench.document, 0);
    const mid = solveDocument(bench.document, 10);
    const end = solveDocument(bench.document, 20);
    expect(start.camera.focalLength).toBeGreaterThan(70);
    expect(mid.camera.focalLength).toBeLessThan(start.camera.focalLength - 10);
    expect(mid.camera.focalLength).toBeGreaterThan(38);
    const startDist = Math.hypot(
      start.camera.position[0] - start.entities.person_a.position[0],
      start.camera.position[2] - start.entities.person_a.position[2],
    );
    expect(startDist).toBeLessThan(1.4);
    expect(mid.entities.person_a.position[2]).toBeGreaterThan(start.entities.person_a.position[2] + 4);
    expect(end.entities.person_a.position[2]).toBeGreaterThan(mid.entities.person_a.position[2]);
    expect(end.camera.position[2]).toBeLessThan(end.entities.person_a.position[2]);
    expect(end.camera.position[1]).toBeGreaterThan(2.1);
    expect(end.camera.position[0]).toBeGreaterThan(end.entities.person_a.position[0] + 1.2);
    expect(end.camera.focalLength).toBeCloseTo(solveDocument(bench.document, 12).camera.focalLength, 1);
    for (const t of [0, 2, 4, 6, 8, 10, 12]) {
      const frame = solveDocument(bench.document, t);
      expect(frame.camera.position[2]).toBeGreaterThan(frame.entities.person_a.position[2] + 0.6);
    }
    const crate = end.entities.crate_hero.position;
    expect(crate[2]).toBeGreaterThan(end.entities.person_a.position[2]);
    const samples = sampleDocument(bench.document, 30);
    let maxStep = 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1].camera.position;
      const b = samples[i].camera.position;
      maxStep = Math.max(maxStep, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    expect(maxStep).toBeLessThan(0.35);
  });

  it("dusk living room walks to the window and lands at 35mm", () => {
    const bench = ALL_BENCHES.find((item) => item.id === "dusk")!;
    const start = solveDocument(bench.document, 0);
    const pause = solveDocument(bench.document, 5.6);
    const end = solveDocument(bench.document, 12);
    expect(start.camera.focalLength).toBeCloseTo(24, 0);
    expect(end.camera.focalLength).toBeCloseTo(32, 0);
    expect(pause.entities.person_a.position[2]).toBeGreaterThan(2.2);
    expect(pause.entities.person_a.position[2]).toBeLessThan(2.9);
    expect(end.entities.person_a.position[2]).toBeGreaterThan(pause.entities.person_a.position[2] + 1.6);
    expect(Math.abs(end.entities.person_a.yaw)).toBeLessThan(0.35);
    expect(end.camera.position[0]).toBeGreaterThan(end.entities.person_a.position[0] + 0.8);
    const endDist = Math.hypot(
      end.camera.position[0] - end.entities.person_a.position[0],
      end.camera.position[2] - end.entities.person_a.position[2],
    );
    expect(endDist).toBeGreaterThan(1.8);
    const samples = sampleDocument(bench.document, 24);
    let maxStep = 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1].camera.position;
      const b = samples[i].camera.position;
      maxStep = Math.max(maxStep, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    expect(maxStep).toBeLessThan(0.25);
  });

  it("solves every bench without throwing", () => {
    for (const bench of ALL_BENCHES) {
      const result = solveDocument(bench.document, bench.duration / 2);
      expect(result.camera.focalLength).toBeGreaterThan(1);
    }
  });
});
