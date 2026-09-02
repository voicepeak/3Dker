import { useProjectStore } from "../store/projectStore";
import type { Vec3 } from "@semantic-director/shared";
import { TYPE_LABEL, anchorLabel } from "../i18n";

function VecField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Vec3;
  onChange: (v: Vec3) => void;
}) {
  return (
    <div className="field row">
      <label>{label}</label>
      {([0, 1, 2] as const).map((i) => (
        <input
          key={i}
          type="number"
          step={0.05}
          value={Number(value[i].toFixed(3))}
          onChange={(e) => {
            const next: Vec3 = [...value];
            next[i] = Number(e.target.value);
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

export function Inspector() {
  const entity = useProjectStore((s) => s.scene.entities.find((e) => e.id === s.selectedId));
  const setTransform = useProjectStore((s) => s.setTransform);
  const updateEntity = useProjectStore((s) => s.updateEntity);
  const setMotionPath = useProjectStore((s) => s.setMotionPath);
  const clearMotionPath = useProjectStore((s) => s.clearMotionPath);

  if (!entity) {
    return (
      <aside className="inspector">
        <div className="panel-title">属性</div>
        <div className="field">
          <span />
          <span style={{ color: "var(--muted)", fontSize: 12 }}>未选中物体</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <div className="panel-title">属性</div>
      <div className="field">
        <label>名称</label>
        <input value={entity.name} onChange={(e) => updateEntity(entity.id, { name: e.target.value })} />
      </div>
      <div className="field">
        <label>类型</label>
        <input value={TYPE_LABEL[entity.semanticType]} readOnly />
      </div>
      <VecField
        label="位置"
        value={entity.transform.position}
        onChange={(v) => setTransform(entity.id, "position", [v[0], 0, v[2]])}
      />
      <VecField
        label="旋转"
        value={entity.transform.rotation}
        onChange={(v) => setTransform(entity.id, "rotation", v)}
      />
      <VecField
        label="缩放"
        value={entity.transform.scale}
        onChange={(v) => setTransform(entity.id, "scale", v)}
      />
      <div className="panel-title">语义锚点</div>
      {Object.keys(entity.anchors).map((name) => (
        <div className="field" key={name}>
          <label>{anchorLabel(name)}</label>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {entity.anchors[name].map((n) => n.toFixed(2)).join(" , ")}
          </span>
        </div>
      ))}
      {entity.semanticType === "person" && (
        <>
          <div className="panel-title">人物路径</div>
          <div className="add-row">
            <button
              onClick={() => {
                const p = entity.transform.position;
                setMotionPath(
                  entity.id,
                  [
                    [p[0], 0, p[2]],
                    [p[0] + 1.2, 0, p[2] + 2],
                    [p[0], 0, p[2] + 4],
                  ],
                  6,
                );
              }}
            >
              设置三点路径
            </button>
            <button onClick={() => clearMotionPath(entity.id)}>清除路径</button>
          </div>
        </>
      )}
    </aside>
  );
}
