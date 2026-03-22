'use client';

import { MODEL_CATALOG, getModelById } from '@/lib/ai/model-catalog';
import { cn } from '@/lib/utils';

type ModelPickerProps = {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  label?: string;
};

export function ModelPicker({ value, onChange, disabled, label = 'Model' }: ModelPickerProps) {
  const current = getModelById(value);
  const byProvider = {
    openai: MODEL_CATALOG.filter((m) => m.provider === 'openai'),
    anthropic: MODEL_CATALOG.filter((m) => m.provider === 'anthropic'),
    google: MODEL_CATALOG.filter((m) => m.provider === 'google'),
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm',
          'transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30'
        )}
      >
        {(['openai', 'anthropic', 'google'] as const).map((provider) => (
          <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
            {byProvider[provider].map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {current?.description && (
        <span className="text-xs text-muted-foreground">{current.description}</span>
      )}
    </div>
  );
}
