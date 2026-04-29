'use client';

interface ProgressBarProps {
  percent: number;
}

export default function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="status-progress rounded-full overflow-hidden relative border border-white/8 h-4">
      <div
        className="bg-gradient-to-br from-lime-400 to-green-500 h-full rounded-full relative transition-all duration-300"
        style={{ width: `${clamped}%` }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-xs text-black font-semibold">
          {Math.round(clamped)}%
        </div>
      </div>
    </div>
  );
}

