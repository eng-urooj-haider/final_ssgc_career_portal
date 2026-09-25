// components/StaticProgressBar.tsx
import React from "react";
import { Flame } from "lucide-react";

interface ProgressBarProps {
  /** Static percentage value to display (0 to 100) */
  progress?: number;
}

export function ProgressBar({ progress = 0 }: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    // <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-6 flex flex-col items-center justify-center">
      {/* <div className="mb-2 flex items-center justify-end"> */}
      {/* <div className="flex items-center gap-2">
      <Flame className="h-5 w-5 text-[#1C6FD9]" />
      <span className="text-sm font-semibold text-slate-800">
        Application Progress
      </span>
    </div> */}
      {/* <span className="text-sm font-bold text-[#1C6FD9]">
      {Math.round(clampedProgress)}%
    </span> */}
      {/* </div> */}

      {/* Progress Track */}
      <div className="relative flex h-5 w-[90%] items-center justify-center overflow-hidden rounded-full bg-slate-100 shadow-inner">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#1C6FD9] via-[#2E8FD6] to-[#F0862E] transition-all duration-500 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />

        {/* Percentage Label */}
        <span className="relative z-10 text-xs font-bold text-slate-800 drop-shadow-sm">
          {Math.round(clampedProgress)}%
        </span>
      </div>

      {/* <p className="mt-2 text-xs text-slate-500">
    Completing profile sections across all tabs increases your score for this job.
  </p> */}
    </div>
  );
}
