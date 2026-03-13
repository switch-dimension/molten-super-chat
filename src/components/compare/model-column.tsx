'use client';

import { getModelById } from '@/lib/ai/model-catalog';
import { MemoizedMarkdown } from '@/components/ui/memoized-markdown';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

type ModelColumnProps = {
  modelKey: string;
  branchId?: string | null;
  output: string;
  isStreaming?: boolean;
  error?: string;
  onPromote?: () => void;
};

export function ModelColumn({
  modelKey,
  output,
  isStreaming,
  error,
  onPromote,
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
      </div>
    </div>
  );
}
