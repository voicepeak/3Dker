import type { FramingType, MotionIntent } from "@semantic-director/camera-dsl";
import { ANCHOR_LABEL, FRAMING_LABEL, MOTION_LABEL, SIDE_LABEL } from "../i18n";
import { useProjectStore } from "../store/projectStore";

const MOTIONS: MotionIntent["type"][] = ["static", "orbit", "dolly", "truck", "crane", "follow"];
const FRAMINGS: FramingType[] = ["extreme_wide", "wide", "full", "medium", "medium_close", "close"];
const SIDES = ["front", "back", "left", "right"] as const;
const FOLLOW_SIDES = ["front", "back", "left", "right", "back_left", "back_right"] as const;

export function CameraIntentPanel() {
  const intent = useProjectStore((s) => s.cameraIntents.find((i) => i.id === s.activeIntentId) ?? s.cameraIntents[0]);
  const entities = useProjectStore((s) => s.scene.entities);
  const updateIntent = useProjectStore((s) => s.updateIntent);
  const setMotion = useProjectStore((s) => s.setMotion);
  const resolve = useProjectStore((s) => s.resolve);
  const warnings = useProjectStore((s) => s.solve?.warnings ?? []);
  const solveError = useProjectStore((s) => s.solveError);
  const valid = useProjectStore((s) => s.solve?.valid ?? false);

  if (!intent) return null;
  const motion = intent.motion;
  const target = entities.find((e) => e.id === intent.target.entityId);
  const heightEntityId = intent.height?.type === "anchor" ? intent.height.entityId : "";

  return (
    <section className="intent-panel">
      <div className="panel-title">摄像机意图 · 唯一真相源 · 不手K关键帧</div>
      <div className="intent-grid">
        <div className="field">
          <label>运动</label>
          <select
            value={motion.type}
            onChange={(e) => {
              const type = e.target.value as MotionIntent["type"];
              if (type === "orbit") setMotion({ type, angle: 360, direction: "clockwise", startAzimuth: 0 });
              if (type === "dolly") setMotion({ type, direction: "in", startSide: "front" });
              if (type === "truck") setMotion({ type, direction: "left", distance: 2, startSide: "front" });
              if (type === "crane") setMotion({ type, direction: "up", distance: 1, startSide: "front" });
              if (type === "follow") setMotion({ type, offset: { side: "back_left" } });
              if (type === "static") setMotion({ type, startSide: "front" });
            }}
          >
            {MOTIONS.map((m) => (
              <option key={m} value={m}>
                {MOTION_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>目标</label>
          <select
            value={intent.target.entityId}
            onChange={(e) => updateIntent({ target: { ...intent.target, entityId: e.target.value } })}
          >
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>锚点</label>
          <select
            value={intent.target.anchor}
            onChange={(e) => updateIntent({ target: { ...intent.target, anchor: e.target.value } })}
          >
            {Object.keys(target?.anchors ?? { chest: 0 }).map((name) => (
              <option key={name} value={name}>
                {ANCHOR_LABEL[name] ?? name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>高度</label>
          <select
            value={intent.height?.type === "anchor" ? `anchor:${heightEntityId}` : intent.height?.type ?? "none"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "none") updateIntent({ height: undefined });
              else if (v === "target_relative")
                updateIntent({ height: { type: "target_relative", anchor: intent.target.anchor, priority: "soft" } });
              else if (v.startsWith("anchor:"))
                updateIntent({
                  height: { type: "anchor", entityId: v.slice(7), anchor: "top", priority: "soft" },
                });
            }}
          >
            <option value="none">默认（目标高度）</option>
            <option value="target_relative">目标锚点</option>
            {entities.map((entity) => (
              <option key={entity.id} value={`anchor:${entity.id}`}>
                {entity.name} / 顶部
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>镜头</label>
          <select value={intent.lens.focalLength} onChange={(e) => updateIntent({ lens: { focalLength: Number(e.target.value) } })}>
            {[24, 35, 50, 85].map((mm) => (
              <option key={mm} value={mm}>
                {mm}mm
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>景别</label>
          <select value={intent.framing.type} onChange={(e) => updateIntent({ framing: { type: e.target.value as FramingType } })}>
            {FRAMINGS.map((f) => (
              <option key={f} value={f}>
                {FRAMING_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>时长</label>
          <input
            type="number"
            min={1}
            step={0.5}
            value={intent.duration}
            onChange={(e) => updateIntent({ duration: Number(e.target.value) })}
          />
        </div>
        {motion.type === "orbit" && (
          <>
            <div className="field">
              <label>角度</label>
              <input
                type="number"
                value={motion.angle}
                onChange={(e) =>
                  setMotion({
                    type: "orbit",
                    angle: Number(e.target.value),
                    direction: motion.direction,
                    startAzimuth: motion.startAzimuth,
                    startSide: motion.startSide,
                    targetEntityId: motion.targetEntityId,
                  })
                }
              />
            </div>
            <div className="field">
              <label>方向</label>
              <select
                value={motion.direction}
                onChange={(e) =>
                  setMotion({
                    type: "orbit",
                    angle: motion.angle,
                    direction: e.target.value as "clockwise" | "counter_clockwise",
                    startAzimuth: motion.startAzimuth,
                    startSide: motion.startSide,
                    targetEntityId: motion.targetEntityId,
                  })
                }
              >
                <option value="clockwise">顺时针</option>
                <option value="counter_clockwise">逆时针</option>
              </select>
            </div>
            <div className="field">
              <label>起始方位</label>
              <input
                type="number"
                value={motion.startAzimuth}
                onChange={(e) =>
                  setMotion({
                    type: "orbit",
                    angle: motion.angle,
                    direction: motion.direction,
                    startAzimuth: Number(e.target.value),
                    startSide: motion.startSide,
                    targetEntityId: motion.targetEntityId,
                  })
                }
              />
            </div>
          </>
        )}
        {motion.type === "dolly" && (
          <>
            <div className="field">
              <label>推拉</label>
              <select
                value={motion.direction}
                onChange={(e) =>
                  setMotion({
                    type: "dolly",
                    direction: e.target.value as "in" | "out",
                    startSide: motion.startSide,
                    distance: motion.distance,
                  })
                }
              >
                <option value="in">推进</option>
                <option value="out">拉远</option>
              </select>
            </div>
            <div className="field">
              <label>起始侧面</label>
              <select
                value={motion.startSide}
                onChange={(e) =>
                  setMotion({
                    type: "dolly",
                    direction: motion.direction,
                    startSide: e.target.value as (typeof SIDES)[number],
                    distance: motion.distance,
                  })
                }
              >
                {SIDES.map((s) => (
                  <option key={s} value={s}>
                    {SIDE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {motion.type === "truck" && (
          <>
            <div className="field">
              <label>横移</label>
              <select
                value={motion.direction}
                onChange={(e) =>
                  setMotion({
                    type: "truck",
                    direction: e.target.value as "left" | "right",
                    distance: motion.distance,
                    startSide: motion.startSide,
                  })
                }
              >
                <option value="left">向左</option>
                <option value="right">向右</option>
              </select>
            </div>
            <div className="field">
              <label>距离</label>
              <input
                type="number"
                value={motion.distance}
                onChange={(e) =>
                  setMotion({
                    type: "truck",
                    direction: motion.direction,
                    distance: Number(e.target.value),
                    startSide: motion.startSide,
                  })
                }
              />
            </div>
          </>
        )}
        {motion.type === "crane" && (
          <>
            <div className="field">
              <label>升降</label>
              <select
                value={motion.direction}
                onChange={(e) =>
                  setMotion({
                    type: "crane",
                    direction: e.target.value as "up" | "down",
                    distance: motion.distance,
                    startSide: motion.startSide,
                  })
                }
              >
                <option value="up">升起</option>
                <option value="down">降下</option>
              </select>
            </div>
            <div className="field">
              <label>距离</label>
              <input
                type="number"
                value={motion.distance}
                onChange={(e) =>
                  setMotion({
                    type: "crane",
                    direction: motion.direction,
                    distance: Number(e.target.value),
                    startSide: motion.startSide,
                  })
                }
              />
            </div>
          </>
        )}
        {motion.type === "follow" && (
          <div className="field">
            <label>机位</label>
            <select
              value={motion.offset.side}
              onChange={(e) =>
                setMotion({
                  type: "follow",
                  offset: { side: e.target.value as (typeof FOLLOW_SIDES)[number] },
                })
              }
            >
              {FOLLOW_SIDES.map((s) => (
                <option key={s} value={s}>
                  {SIDE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        )}
        {motion.type === "static" && (
          <div className="field">
            <label>起始侧面</label>
            <select
              value={motion.startSide}
              onChange={(e) =>
                setMotion({ type: "static", startSide: e.target.value as (typeof SIDES)[number] })
              }
            >
              {SIDES.map((s) => (
                <option key={s} value={s}>
                  {SIDE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label />
          <button className="primary" onClick={resolve}>
            求解摄像机
          </button>
        </div>
      </div>
      <div className={`warnings ${warnings.length || solveError ? "" : "empty"}`}>
        {solveError
          ? solveError
          : warnings.length
            ? warnings
                .filter((_, i) => i < 4)
                .map((w) => w.message)
                .join(" · ") + (warnings.length > 4 ? ` · 另有 ${warnings.length - 4} 条` : "")
            : valid
              ? "摄像机路径有效 · 无碰撞"
              : "待求解"}
      </div>
    </section>
  );
}
