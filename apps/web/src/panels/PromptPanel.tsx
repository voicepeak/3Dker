import { useState } from "react";
import { useProjectStore } from "../store/projectStore";

const SCENE_EXAMPLE = "原点放一个人物，右侧放花瓶，人物前方再放一张桌子。";
const CAMERA_EXAMPLE = "保持花瓶顶部高度，以35mm中景顺时针环绕人物360度，持续6秒，始终看向胸部。";

export function PromptPanel() {
  const [sceneText, setSceneText] = useState(SCENE_EXAMPLE);
  const [cameraText, setCameraText] = useState(CAMERA_EXAMPLE);
  const [showKey, setShowKey] = useState(false);
  const llm = useProjectStore((s) => s.llm);
  const busy = useProjectStore((s) => s.llmBusy);
  const error = useProjectStore((s) => s.llmError);
  const logs = useProjectStore((s) => s.promptLog);
  const hasScene = useProjectStore((s) => s.scene.entities.length > 0);
  const setLlm = useProjectStore((s) => s.setLlm);
  const generateScene = useProjectStore((s) => s.generateScene);
  const generateCamera = useProjectStore((s) => s.generateCamera);
  const applyPrompt = useProjectStore((s) => s.applyPrompt);
  const ready = Boolean(llm?.apiKey?.trim());

  return (
    <section className="prompt-panel">
      <div className="panel-title">LLM 导演 · 先调度场景，再生成运镜</div>
      <div className="llm-grid">
        <div className="field">
          <label>DeepSeek Key</label>
          <input
            type={showKey ? "text" : "password"}
            value={llm.apiKey}
            placeholder="sk- 稍后填入，保存在本机"
            onChange={(e) => setLlm({ apiKey: e.target.value })}
          />
        </div>
        <div className="field">
          <label>模型</label>
          <input value={llm.model} onChange={(e) => setLlm({ model: e.target.value })} />
        </div>
        <div className="field">
          <label />
          <button onClick={() => setShowKey((v) => !v)}>{showKey ? "隐藏 Key" : "显示 Key"}</button>
        </div>
      </div>
      <div className="llm-columns">
        <div>
          <div className="panel-title">① 场景调度</div>
          <textarea
            value={sceneText}
            onChange={(e) => setSceneText(e.target.value)}
            placeholder="描述要放什么、相对谁、哪一侧"
          />
          <div className="add-row">
            <button className="primary" disabled={busy !== "idle"} onClick={() => generateScene(sceneText)}>
              {busy === "scene" ? "调度中…" : ready ? "生成场景" : "生成场景（需 Key）"}
            </button>
            <button disabled={busy !== "idle"} onClick={() => applyPrompt(sceneText)}>
              规则解析场景
            </button>
          </div>
        </div>
        <div>
          <div className="panel-title">② 摄像机轨迹</div>
          <textarea
            value={cameraText}
            onChange={(e) => setCameraText(e.target.value)}
            placeholder="描述环绕 / 推进 / 跟随，不要写坐标"
          />
          <div className="add-row">
            <button
              className="primary"
              disabled={busy !== "idle" || !hasScene}
              onClick={() => generateCamera(cameraText)}
            >
              {busy === "camera" ? "求解意图中…" : hasScene ? (ready ? "生成运镜" : "生成运镜（需 Key）") : "先布置场景"}
            </button>
            <button disabled={busy !== "idle"} onClick={() => applyPrompt(cameraText)}>
              规则解析运镜
            </button>
          </div>
        </div>
      </div>
      <div className={`prompt-log ${error ? "error" : ""}`}>
        {error ? error : logs.length ? logs.join(" · ") : ready ? "Key 已保存到本机 localStorage" : "填入 DeepSeek API Key 后即可调用模型"}
      </div>
    </section>
  );
}
