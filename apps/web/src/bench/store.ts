import { create } from "zustand";
import { ALL_BENCHES, solveDocument, type OperatorBench } from "@semantic-director/dsl-runtime";

interface BenchStore {
  benchId: string;
  currentTime: number;
  playing: boolean;
  select: (id: string) => void;
  play: () => void;
  pause: () => void;
  scrub: (time: number) => void;
  tick: (dt: number) => void;
}

export function currentBench(): OperatorBench {
  return ALL_BENCHES.find((item) => item.id === useBenchStore.getState().benchId) ?? ALL_BENCHES[0];
}

export const useBenchStore = create<BenchStore>((set, get) => ({
  benchId: "dusk",
  currentTime: 0,
  playing: true,
  select: (id) => set({ benchId: id, currentTime: 0, playing: id === "dusk" || id === "oner" }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  scrub: (time) => set({ currentTime: Math.max(0, time), playing: false }),
  tick: (dt) => {
    const state = get();
    if (!state.playing) return;
    const duration = (ALL_BENCHES.find((item) => item.id === state.benchId) ?? ALL_BENCHES[0]).duration;
    let next = state.currentTime + dt;
    if (next >= duration) next = 0;
    set({ currentTime: next });
  },
}));

export function solvedNow() {
  const { benchId, currentTime } = useBenchStore.getState();
  const bench = ALL_BENCHES.find((item) => item.id === benchId) ?? ALL_BENCHES[0];
  return { bench, ...solveDocument(bench.document, currentTime) };
}
