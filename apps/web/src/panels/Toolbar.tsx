import { useRef } from "react";
import { useProjectStore } from "../store/projectStore";

export function Toolbar() {
  const name = useProjectStore((s) => s.name);
  const valid = useProjectStore((s) => s.solve?.valid);
  const warnings = useProjectStore((s) => s.solve?.warnings.length ?? 0);
  const previewOpen = useProjectStore((s) => s.previewOpen);
  const loadDemo = useProjectStore((s) => s.loadDemo);
  const saveToFile = useProjectStore((s) => s.saveToFile);
  const loadFromText = useProjectStore((s) => s.loadFromText);
  const exportCamera = useProjectStore((s) => s.exportCamera);
  const play = useProjectStore((s) => s.play);
  const togglePreview = useProjectStore((s) => s.togglePreview);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="toolbar">
      <h1>语义三维导演台</h1>
      <button onClick={() => loadDemo("empty")}>新建</button>
      <button onClick={saveToFile}>保存</button>
      <button onClick={() => fileRef.current?.click()}>打开</button>
      <button onClick={exportCamera}>导出摄像机</button>
      <button className="primary" onClick={play}>
        播放
      </button>
      <button className={previewOpen ? "active" : ""} onClick={() => togglePreview()}>
        {previewOpen ? "关闭预览" : "摄像机预览"}
      </button>
      <span className="spacer" />
      <button onClick={() => loadDemo("A")}>示例 A 环绕</button>
      <button onClick={() => loadDemo("B")}>示例 B 碰撞</button>
      <button onClick={() => loadDemo("C")}>示例 C 跟随</button>
      <span className="status">
        {name} · {valid ? "路径正常" : "发生碰撞"} · {warnings} 条警告
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          loadFromText(await file.text());
          e.target.value = "";
        }}
      />
    </header>
  );
}
