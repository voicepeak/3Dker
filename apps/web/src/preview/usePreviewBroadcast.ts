import { useEffect } from "react";
import { peekPlaybackTime, useProjectStore } from "../store/projectStore";
import { previewChannel, type PreviewSnapshot } from "./sync";

function snapshot(): PreviewSnapshot {
  const s = useProjectStore.getState();
  const intent = s.cameraIntents.find((i) => i.id === s.activeIntentId) ?? s.cameraIntents[0];
  return {
    name: s.name,
    entities: s.scene.entities,
    intent,
    solve: s.solve,
    currentTime: peekPlaybackTime(),
    duration: s.playback.duration,
    playing: s.playback.playing,
  };
}

export function usePreviewBroadcast() {
  useEffect(() => {
    const channel = previewChannel();
    const postSnapshot = () => channel.postMessage({ type: "snapshot", payload: snapshot() });
    const postPlayback = () => {
      const s = useProjectStore.getState();
      channel.postMessage({
        type: "playback",
        payload: {
          currentTime: peekPlaybackTime(),
          duration: s.playback.duration,
          playing: s.playback.playing,
        },
      });
    };
    const unsub = useProjectStore.subscribe((state, prev) => {
      if (
        state.scene !== prev.scene ||
        state.solve !== prev.solve ||
        state.cameraIntents !== prev.cameraIntents
      ) {
        postSnapshot();
      }
    });
    channel.onmessage = (event) => {
      if (event.data?.type === "hello") postSnapshot();
    };
    postSnapshot();
    const timer = window.setInterval(postPlayback, 33);
    return () => {
      window.clearInterval(timer);
      unsub();
      channel.close();
    };
  }, []);
}
