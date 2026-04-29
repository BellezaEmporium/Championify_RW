'use client';

import * as Tooltip from '@radix-ui/react-tooltip';

interface OptionCheckboxProps {
  id: string;
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export default function OptionCheckbox({
  id,
  label,
  tooltip,
  checked,
  onChange,
  hint,
}: OptionCheckboxProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <label className="option-row cursor-pointer">
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={e => onChange(e.target.checked)}
            />
            <span>
              {label}
              {hint && <span className="text-slate-400 text-xs ml-1">{hint}</span>}
            </span>
          </label>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-slate-800 border border-white/10 text-slate-200 text-xs px-3 py-2 rounded-lg shadow-xl max-w-[200px] z-50"
            sideOffset={4}
          >
            {tooltip}
            <Tooltip.Arrow className="fill-slate-800" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

