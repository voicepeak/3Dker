import type { SemanticType } from "@semantic-director/shared";
import { TYPE_LABEL } from "../i18n";
import { useProjectStore } from "../store/projectStore";

const TYPES: SemanticType[] = ["person", "vase", "table", "box", "wall", "door"];

export function ScenePanel() {
  const entities = useProjectStore((s) => s.scene.entities);
  const selectedId = useProjectStore((s) => s.selectedId);
  const select = useProjectStore((s) => s.select);
  const addEntity = useProjectStore((s) => s.addEntity);
  const removeSelected = useProjectStore((s) => s.removeSelected);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);

  return (
    <aside className="scene-panel">
      <div className="panel-title">场景物体</div>
      <div className="add-row">
        {TYPES.map((type) => (
          <button key={type} onClick={() => addEntity(type)}>
            + {TYPE_LABEL[type]}
          </button>
        ))}
      </div>
      <ul className="entity-list">
        {entities.map((entity) => (
          <li
            key={entity.id}
            className={entity.id === selectedId ? "selected" : ""}
            onClick={() => select(entity.id)}
          >
            <span>{entity.name}</span>
            <span className="type">{TYPE_LABEL[entity.semanticType]}</span>
          </li>
        ))}
      </ul>
      <div className="add-row">
        <button onClick={duplicateSelected}>复制</button>
        <button className="danger" onClick={removeSelected}>
          删除
        </button>
      </div>
    </aside>
  );
}
