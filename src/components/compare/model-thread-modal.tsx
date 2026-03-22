'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ThreadTurn } from '@/lib/compare/thread';
import { Button } from '@/components/ui/button';
import { MemoizedMarkdown } from '@/components/ui/memoized-markdown';

type ModelThreadModalProps = {
  open: boolean;
  onClose: () => void;
  modelLabel: string;
  turns: ThreadTurn[];
};

export function ModelThreadModal({ open, onClose, modelLabel, turns }: ModelThreadModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="thread-modal-title"
        className="relative flex h-[min(90vh,920px)] w-[min(96vw,1200px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3">
          <h2 id="thread-modal-title" className="truncate text-lg font-semibold text-foreground">
            {modelLabel}
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            <X className="size-4" />
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {turns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <div className="space-y-8">
              {turns.map((turn, i) => (
                <div key={i} className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">You</span>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{turn.user}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">Assistant</span>
                    {turn.error ? (
                      <p className="mt-1 text-sm text-destructive">{turn.error}</p>
                    ) : turn.assistant ? (
                      <div className="mt-1 text-sm text-foreground">
                        <MemoizedMarkdown id={`thread-modal-${i}`} content={turn.assistant} />
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">…</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
