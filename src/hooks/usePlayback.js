import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore.js";

/**
 * Drives the step clock while `isPlaying`. Uses a self-scheduling timeout so
 * speed changes take effect on the very next tick. Playback only ever advances
 * the `currentStep` index — the visualizers render the precomputed state at
 * that index, which is what keeps play / scrub / step-back perfectly in sync.
 */
export function usePlayback() {
  const isPlaying = useStore((s) => s.isPlaying);
  const speed = useStore((s) => s.speed);
  const baseInterval = useStore((s) => s.baseInterval);
  const timer = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    const interval = Math.max(40, baseInterval / speed);
    const schedule = () => {
      timer.current = setTimeout(() => {
        const s = useStore.getState();
        s.tick();
        if (useStore.getState().isPlaying) schedule();
      }, interval);
    };
    schedule();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isPlaying, speed, baseInterval]);
}
