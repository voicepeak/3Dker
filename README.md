# Semantic 3D Director

面向 AIGC 视频生成前置环节的 3D 白膜导演工具。用户不手 K 摄像机关键帧，只通过 **Semantic Camera Intent** 生成可播放、可修改、可导出的白膜摄像机动画。

```text
GUI 摄影意图 → Camera Intent → Constraint Solver → Camera(t) → 3D 白膜
```

## 运行

```bash
cd semantic-director
npm install
npm test
npm run dev
```

打开 `http://127.0.0.1:5174`。

Issue #2 的算子检验台在新分支 `feat/dsl-operator-bench`：

```bash
git checkout feat/dsl-operator-bench
npm run dev
```

打开 `http://127.0.0.1:5175/bench.html`。左侧点每一个摄像机 / 实体原语即可播放。希区柯克在「配方」里，展开为 `translate + zoom + framing lock`，不是基础算子。

## 三个 Demo

- **Demo A**：花瓶顶部高度，35mm 中景，顺时针环绕人物 360° / 6s，始终看向胸部。改花瓶高度或人物位置会自动重算。
- **Demo B**：桌面高度，50mm 中近景，从人物正前方向人物推进 4s。撞墙时路径标红并给出 `Camera collision with wall_01 at t`。
- **Demo C**：35mm 中景，人物左后方跟随，人物沿路径移动时摄像机自动重算。

## 原则

Camera Intent 是 Source of Truth。Camera Samples 只是 Solver 输出。本阶段不接 LLM，不提供手动 Camera Keyframe 编辑器。
