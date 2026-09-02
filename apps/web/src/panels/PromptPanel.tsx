import { useState } from "react";
import { useProjectStore } from "../store/projectStore";

const EXAMPLES = [
  "原点放一个人物，右侧放花瓶。摄像机保持花瓶顶部高度，以35mm中景顺时针环绕人物360度，持续6秒，始终看向胸部。",
  "人物前方放一张桌子，更前方放一堵墙。50mm中近景，从人物正前方向人物推进，持续4秒，高度在桌面。",
  "35mm中景，人物左后方跟随，看向胸部。人物向前走4米。",
];

export function PromptPanel() {
  const [text, setText] = useState(EXAMPLES[0]);
  const applyPrompt = useProjectStore((s) => s.applyPrompt);
  const logs = useProjectStore((s) => s.promptLog);

  return (
    <section className="prompt-panel">
      <div className="panel-title">中文提示词 · 布置物体 + 摄像机走势</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例如：原点放一个人物，右侧放花瓶。摄像机以35mm中景环绕人物360度，看向胸部。"
      />
      <div className="add-row">
        <button className="primary" onClick={() => applyPrompt(text)}>
          应用提示词
        </button>
        {EXAMPLES.map((example, i) => (
          <button key={i} onClick={() => setText(example)}>
            填入示例 {i + 1}
          </button>
        ))}
      </div>
      {logs.length > 0 && <div className="prompt-log">{logs.join(" · ")}</div>}
    </section>
  );
}
