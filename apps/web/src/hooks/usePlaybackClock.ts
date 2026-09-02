import { useEffect } from "react";
import { useProjectStore } from "../store/projectStore";

export function PlaybackClock() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.08, Math.max(0, (now - last) / 1000));
      last = now;
      useProjectStore.getState().tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
