import { useProjectStore } from "../store/projectStore";

export function PlaybackBar() {
  const currentTime = useProjectStore((s) => s.playback.currentTime);
  const duration = useProjectStore((s) => s.playback.duration);
  const playing = useProjectStore((s) => s.playback.playing);
  const play = useProjectStore((s) => s.play);
  const pause = useProjectStore((s) => s.pause);
  const scrub = useProjectStore((s) => s.scrub);

  return (
    <footer className="playback">
      <button className="primary" onClick={() => (playing ? pause() : play())}>
        {playing ? "暂停" : "播放"}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={1 / 30}
        value={currentTime}
        onChange={(e) => scrub(Number(e.target.value))}
      />
      <div className="time">
        {currentTime.toFixed(2)}秒 / {duration.toFixed(2)}秒
      </div>
    </footer>
  );
}
