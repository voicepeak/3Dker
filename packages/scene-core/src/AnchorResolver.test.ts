import { describe, expect, it } from "vitest";
import { createEntity } from "./EntityFactory";
import { resolveAnchor } from "./AnchorResolver";
import { evaluateEntity } from "./SceneGraph";

describe("AnchorResolver", () => {
  it("returns correct world position", () => {
    const person = createEntity("person", { position: [1, 0, 2] });
    const scene = { entities: [person] };
    const chest = resolveAnchor(scene, person.id, "chest");
    expect(chest[0]).toBeCloseTo(1);
    expect(chest[1]).toBeCloseTo(1.25);
    expect(chest[2]).toBeCloseTo(2);
  });

  it("moves with the entity", () => {
    const vase = createEntity("vase", { position: [0, 0, 0] });
    vase.transform.position = [3, 0, -1];
    const top = resolveAnchor({ entities: [vase] }, vase.id, "top");
    expect(top[1]).toBeCloseTo(0.4);
    expect(top[0]).toBeCloseTo(3);
  });

  it("falls back when the requested anchor is missing", () => {
    const vase = createEntity("vase", { position: [2, 0, 0] });
    const pos = resolveAnchor({ entities: [vase] }, vase.id, "chest");
    expect(pos[0]).toBeCloseTo(2);
    expect(pos[1]).toBeCloseTo(0.2, 1);
  });

  it("follows person motion path", () => {
    const person = createEntity("person", { position: [0, 0, 0] });
    person.motionPath = {
      duration: 2,
      waypoints: [
        [0, 0, 0],
        [4, 0, 0],
      ],
    };
    const start = evaluateEntity(person, 0).position;
    const mid = evaluateEntity(person, 1).position;
    const end = evaluateEntity(person, 2).position;
    expect(start[0]).toBeCloseTo(0, 1);
    expect(end[0]).toBeCloseTo(4, 1);
    expect(mid[0]).toBeGreaterThan(1);
    expect(mid[0]).toBeLessThan(3);
  });
});
