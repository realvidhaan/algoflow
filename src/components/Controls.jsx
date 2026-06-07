import React from "react";
import { useStore } from "../store/useStore.js";

const SPEED_STEPS = [0.25, 0.5, 1, 2, 4, 8];

function IconButton({ onClick, title, children, primary }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm transition ${
        primary
          ? "border-violet-500 bg-violet-600 text-white hover:bg-violet-500"
          : "border-border bg-panel-2 text-slate-200 hover:border-slate-600 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function Controls() {
  const isPlaying = useStore((s) => s.isPlaying);
  const currentStep = useStore((s) => s.currentStep);
  const speed = useStore((s) => s.speed);
  const total = useStore((s) => s.totalSteps());

  const togglePlay = useStore((s) => s.togglePlay);
  const stepForward = useStore((s) => s.stepForward);
  const stepBack = useStore((s) => s.stepBack);
  const jumpStart = useStore((s) => s.jumpStart);
  const jumpEnd = useStore((s) => s.jumpEnd);
  const setStep = useStore((s) => s.setStep);
  const setSpeed = useStore((s) => s.setSpeed);

  const speedIdx = Math.max(0, SPEED_STEPS.indexOf(speed));
  const atEnd = currentStep >= total - 1;

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-panel/60 px-4 py-2.5">
      {/* Scrubber */}
      <div className="flex items-center gap-3">
        <span className="mono w-24 shrink-0 text-[11px] text-slate-400">
          Step {total ? currentStep + 1 : 0} / {total}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={currentStep}
          onChange={(e) => setStep(Number(e.target.value))}
          className="flex-1"
          aria-label="Progress scrubber"
        />
      </div>

      {/* Transport + speed */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <IconButton onClick={jumpStart} title="Jump to start">
            ⏮
          </IconButton>
          <IconButton onClick={stepBack} title="Step back">
            ◀
          </IconButton>
          <IconButton
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
            primary
          >
            {isPlaying ? "❚❚" : atEnd ? "↻" : "▶"}
          </IconButton>
          <IconButton onClick={stepForward} title="Step forward">
            ▶
          </IconButton>
          <IconButton onClick={jumpEnd} title="Jump to end">
            ⏭
          </IconButton>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Speed</span>
          <input
            type="range"
            min={0}
            max={SPEED_STEPS.length - 1}
            step={1}
            value={speedIdx}
            onChange={(e) => setSpeed(SPEED_STEPS[Number(e.target.value)])}
            className="w-24 sm:w-32"
            aria-label="Speed"
          />
          <span className="mono w-9 text-right text-[11px] font-semibold text-violet-300">
            {speed}×
          </span>
        </div>
      </div>
    </div>
  );
}
