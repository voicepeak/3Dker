import { useEffect } from "react";
import { CAMERA_OP_LABEL, ENTITY_OP_LABEL, HITCHCOCK_RECIPE, operatorWindow } from "@semantic-director/dsl-core";
import { ALL_BENCHES, duskBeat, onerBeat } from "@semantic-director/dsl-runtime";
import { BenchViewport } from "./BenchViewport";
import { currentBench, solvedNow, useBenchStore } from "./store";

export function BenchApp() {
  const benchId = useBenchStore((s) => s.benchId);
  const currentTime = useBenchStore((s) => s.currentTime);
  const playing = useBenchStore((s) => s.playing);
  const select = useBenchStore((s) => s.select);
  const play = useBenchStore((s) => s.play);
  const pause = useBenchStore((s) => s.pause);
  const scrub = useBenchStore((s) => s.scrub);
  const tick = useBenchStore((s) => s.tick);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      tick(Math.min(0.08, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  const bench = currentBench();
  const solved = solvedNow();
  const cam = solved.camera;
  const active = solved.activeCamera.map((op) => op.type).join(" + ") || "none";

  return (
    <div className="bench">
      <header className="masthead">
        <div className="kicker">3Dker DSL v1 · Operator Bench</div>
        <h1>算子检验台</h1>
        <div className="note">默认傍晚客厅一镜 · 24mm 轻弧推进到 35mm</div>
      </header>

      <aside className="catalog">
        <h2>摄像机原语</h2>
        {ALL_BENCHES.filter((item) => item.group === "camera").map((item) => (
          <button key={item.id} className={`op-btn ${item.id === benchId ? "active" : ""}`} onClick={() => select(item.id)}>
            {CAMERA_OP_LABEL[item.primitive as keyof typeof CAMERA_OP_LABEL] ?? item.title}
            <small>{item.primitive}</small>
          </button>
        ))}
        <h2>实体原语</h2>
        {ALL_BENCHES.filter((item) => item.group === "entity").map((item) => (
          <button key={item.id} className={`op-btn ${item.id === benchId ? "active" : ""}`} onClick={() => select(item.id)}>
            {ENTITY_OP_LABEL[item.primitive as keyof typeof ENTITY_OP_LABEL] ?? item.title}
            <small>{item.primitive}</small>
          </button>
        ))}
        <h2>长镜头 / 配方</h2>
        {ALL_BENCHES.filter((item) => item.group === "recipe").map((item) => (
          <button key={item.id} className={`op-btn ${item.id === benchId ? "active" : ""}`} onClick={() => select(item.id)}>
            {item.title}
            <small>
              {item.id === "hitchcock"
                ? HITCHCOCK_RECIPE.expandsTo.join(" + ")
                : item.id === "dusk"
                  ? "门口正背 → 窗边右后三分之四"
                  : "特写 → 全景 → 过肩货箱"}
            </small>
          </button>
        ))}
      </aside>

      <main className="stage">
        <div className="viewport">
          <div className="caption">God view · path</div>
          <BenchViewport mode="god" />
        </div>
        <div className="ground-glass">
          <div className="caption">Ground glass · {cam.focalLength.toFixed(0)}mm</div>
          <div className="reticle" />
          <BenchViewport mode="lens" />
        </div>
      </main>

      <aside className="side">
        <h2>{bench.title}</h2>
        <p>{bench.intent}</p>
        {bench.id === "oner" ? <p className="ok">{onerBeat(currentTime)}</p> : null}
        {bench.id === "dusk" ? <p className="ok">{duskBeat(currentTime)}</p> : null}
        <div className="metrics">
          <div className="metric">
            焦距<b>{cam.focalLength.toFixed(1)} mm</b>
          </div>
          <div className="metric">
            位置
            <b>
              {cam.position[0].toFixed(2)} {cam.position[1].toFixed(2)} {cam.position[2].toFixed(2)}
            </b>
          </div>
          <div className="metric">
            并发算子<b>{active}</b>
          </div>
          <div className="metric">
            看向
            <b>
              {solved.activeCamera.find((op) => op.type === "look_at")?.target?.entityId ??
                (currentTime >= 11.45 ? "person_b" : "person_a")}
            </b>
          </div>
        </div>
        {solved.diagnostics.length ? (
          <div className="warn">{solved.diagnostics.map((d) => `${d.code}: ${d.message}`).join(" · ")}</div>
        ) : (
          <div className="ok">无冲突 · Solver 输出 CameraState(t)</div>
        )}
        <pre className="dsl">{JSON.stringify(bench.document.cameraShot.operators, null, 2)}</pre>
      </aside>

      <footer className="strip">
        <button className="primary" onClick={() => (playing ? pause() : play())}>
          {playing ? "暂停" : "播放"}
        </button>
        <div>
          <input
            type="range"
            min={0}
            max={bench.duration}
            step={1 / 30}
            value={currentTime}
            onChange={(e) => scrub(Number(e.target.value))}
          />
          <div className="tracks">
            {[
              ...bench.document.cameraShot.operators,
              ...bench.document.entityMotion.tracks.flatMap((track) => track.operators),
            ].map((op) => {
              const { start, end } = operatorWindow(op.timing);
              return (
                <div className="track" key={op.id}>
                  <span>{op.type}</span>
                  <div className="lane">
                    <div
                      className="bar"
                      style={{
                        left: `${(start / bench.duration) * 100}%`,
                        width: `${((end - start) / bench.duration) * 100}%`,
                      }}
                    />
                    <div className="head" style={{ left: `${(currentTime / bench.duration) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="time">
          {currentTime.toFixed(2)} / {bench.duration.toFixed(2)} s
        </div>
      </footer>
    </div>
  );
}
