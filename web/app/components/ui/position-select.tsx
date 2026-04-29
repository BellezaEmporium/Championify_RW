'use client';

import * as Select from '@radix-ui/react-select';
import { useTranslations } from 'next-intl';

interface PositionSelectProps {
  value: 'beginning' | 'end';
  onChange: (value: 'beginning' | 'end') => void;
}

export default function PositionSelect({ value, onChange }: PositionSelectProps) {
  const t = useTranslations();

  return (
    <Select.Root value={value} onValueChange={v => onChange(v as 'beginning' | 'end')}>
      <Select.Trigger className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-md text-slate-300 cursor-pointer hover:bg-white/10 transition-colors">
        <Select.Value />
        <Select.Icon>
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
            <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
          <Select.Viewport>
            <Select.Item
              value="beginning"
              className="px-3 py-2 text-sm text-slate-200 hover:bg-sky-500/15 cursor-pointer outline-none data-[highlighted]:bg-sky-500/15"
            >
              <Select.ItemText>{t('beginning')}</Select.ItemText>
            </Select.Item>
            <Select.Item
              value="end"
              className="px-3 py-2 text-sm text-slate-200 hover:bg-sky-500/15 cursor-pointer outline-none data-[highlighted]:bg-sky-500/15"
            >
              <Select.ItemText>{t('end')}</Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

