'use client';

import { MODEL_CATALOG, getModelById, type CatalogModel } from '@/lib/ai/model-catalog';

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
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{current.description}</span>
      )}
    </div>
  );
}
