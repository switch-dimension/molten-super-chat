'use client';

import { getModelById } from '@/lib/ai/model-catalog';
import { MemoizedMarkdown } from '@/components/ui/memoized-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp } from 'lucide-react';

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
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-foreground">
          {catalog?.label ?? modelKey}
        </span>
        <div className="flex gap-1">
          {onPromote && output && !isStreaming && (
            <Button type="button" variant="secondary" size="sm" onClick={onPromote}>
              <ArrowUp className="size-3" />
              Promote
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-[120px] flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <div className="font-medium">Model error</div>
            <p className="mt-1">{error}</p>
          </div>
        )}
        <div className="text-sm text-foreground">
          {output ? (
            <MemoizedMarkdown id={modelKey} content={output} />
          ) : isStreaming ? (
            <span>…</span>
          ) : null}
        </div>
        {onContinue && branchId && output && !isStreaming && (
          <div className="mt-2 border-t border-border pt-2">
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
      <Input
        name="continue-prompt"
        type="text"
        placeholder="Continue this branch..."
        className="flex-1 h-7 text-sm"
      />
      <Button type="submit" size="sm">
        Send
      </Button>
    </form>
  );
}
