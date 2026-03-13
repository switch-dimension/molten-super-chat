'use client';

import { getModelById } from '@/lib/ai/model-catalog';
import { MemoizedMarkdown } from '@/components/ui/memoized-markdown';

type ModelColumnProps = {
  modelKey: string;
  branchId?: string | null;
  output: string;
  isStreaming?: boolean;
  error?: string;
  onPromote?: () => void;
  onContinue?: (branchId: string, prompt: string) => void;
};

export function ModelColumn({
  modelKey,
  branchId,
  output,
  isStreaming,
  error,
  onPromote,
  onContinue,
}: ModelColumnProps) {
  const catalog = getModelById(modelKey);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {catalog?.label ?? modelKey}
        </span>
        <div className="flex gap-1">
          {onPromote && output && !isStreaming && (
            <button
              type="button"
              onClick={onPromote}
              className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-500"
            >
              Promote
            </button>
          )}
        </div>
      </div>
      <div className="min-h-[120px] flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <div className="font-medium">Model error</div>
            <p className="mt-1">{error}</p>
          </div>
        )}
        <div className="text-sm text-zinc-900 dark:text-zinc-100">
          {output ? (
            <MemoizedMarkdown id={modelKey} content={output} />
          ) : isStreaming ? (
            <span>…</span>
          ) : null}
        </div>
        {onContinue && branchId && output && !isStreaming && (
          <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-600">
            <ContinueForm branchId={branchId} onContinue={onContinue} />
          </div>
        )}
      </div>
    </div>
  );
}

function ContinueForm({
  branchId,
  onContinue,
}: {
  branchId: string;
  onContinue: (branchId: string, prompt: string) => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector<HTMLInputElement>('input[name="continue-prompt"]');
    const text = input?.value?.trim();
    if (text && input) {
      onContinue(branchId, text);
      input.value = '';
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="continue-prompt"
        type="text"
        placeholder="Continue this branch..."
        className="flex-1 rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
      />
      <button
        type="submit"
        className="rounded bg-zinc-700 px-2 py-1 text-xs text-white dark:bg-zinc-500"
      >
        Send
      </button>
    </form>
  );
}
