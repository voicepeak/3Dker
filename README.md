# Semantic 3D Director

[![CI](https://github.com/voicepeak/3Dker/actions/workflows/ci.yml/badge.svg)](https://github.com/voicepeak/3Dker/actions/workflows/ci.yml)

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

打开 `http://localhost:5173`。

## 三个 Demo

- **Demo A**：花瓶顶部高度，35mm 中景，顺时针环绕人物 360° / 6s，始终看向胸部。改花瓶高度或人物位置会自动重算。
- **Demo B**：桌面高度，50mm 中近景，从人物正前方向人物推进 4s。撞墙时路径标红并给出 `Camera collision with wall_01 at t`。
- **Demo C**：35mm 中景，人物左后方跟随，人物沿路径移动时摄像机自动重算。

## 原则

Camera Intent 是 Source of Truth。Camera Samples 只是 Solver 输出。本阶段不接 LLM，不提供手动 Camera Keyframe 编辑器。
