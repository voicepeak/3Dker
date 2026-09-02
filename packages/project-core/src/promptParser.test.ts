import { describe, expect, it } from "vitest";
import { createEntity } from "@semantic-director/scene-core";
import { cameraIntentSchema } from "@semantic-director/camera-dsl";
import { applyDirectorPrompt, parseDirectorPrompt } from "./promptParser";

function blankIntent(targetId: string) {
  return cameraIntentSchema.parse({
    id: "cam",
    motion: { type: "static", startSide: "front" },
    target: { entityId: targetId, anchor: "chest" },
    lens: { focalLength: 35 },
    framing: { type: "medium" },
    duration: 5,
  });
}

describe("parseDirectorPrompt", () => {
  it("parses orbit around a person at vase height", () => {
    const parsed = parseDirectorPrompt(
      "原点放一个人物，右侧放花瓶。摄像机保持花瓶顶部高度，以35mm中景顺时针环绕人物360度，持续6秒，始终看向胸部。",
    );
    expect(parsed.ops.some((op) => op.kind === "upsert" && op.type === "person")).toBe(true);
    expect(parsed.ops.some((op) => op.kind === "upsert" && op.type === "vase")).toBe(true);
    expect(parsed.motion?.type).toBe("orbit");
    expect(parsed.focalLength).toBe(35);
    expect(parsed.framing).toBe("medium");
    expect(parsed.duration).toBe(6);
    expect(parsed.targetAnchor).toBe("chest");
    expect(parsed.heightType).toBe("vase");
  });

  it("parses dolly in from the front", () => {
    const parsed = parseDirectorPrompt("50mm中近景，从人物正前方向人物推进，持续4秒，高度在桌面。");
    expect(parsed.motion?.type).toBe("dolly");
    if (parsed.motion?.type === "dolly") expect(parsed.motion.direction).toBe("in");
    expect(parsed.framing).toBe("medium_close");
    expect(parsed.focalLength).toBe(50);
  });

  it("parses follow from back left", () => {
    const parsed = parseDirectorPrompt("35mm中景，人物左后方跟随，看向胸部。人物向前走。");
    expect(parsed.motion?.type).toBe("follow");
    expect(parsed.ops.some((op) => op.kind === "path")).toBe(true);
  });

  it("chains table then wall in front of the person", () => {
    const parsed = parseDirectorPrompt("人物前方放一张桌子，更前方放一堵墙。");
    expect(parsed.ops.filter((op) => op.kind === "upsert")).toHaveLength(3);
  });
});

describe("applyDirectorPrompt", () => {
  it("places a vase to the right of a person and sets orbit intent", () => {
    const person = createEntity("person", { name: "人物", position: [0, 0, 0] });
    const result = applyDirectorPrompt(
      "在人物右侧放一个花瓶。摄像机以35mm中景、花瓶顶部高度，顺时针环绕人物360度，持续6秒，看向胸部。",
      { entities: [person], intent: blankIntent(person.id) },
    );
    const vase = result.entities.find((e) => e.semanticType === "vase");
    expect(vase).toBeTruthy();
    expect(vase!.transform.position[0]).toBeGreaterThan(0.4);
    expect(result.intent.motion.type).toBe("orbit");
    expect(result.intent.height?.type).toBe("anchor");
    expect(result.intent.target.anchor).toBe("chest");
  });
});
