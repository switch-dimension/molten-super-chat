'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompare, Plus, X } from 'lucide-react';
import { formatAiErrorMessage, getApiErrorMessage } from '@/lib/ai/error-message';
import { ModelColumn } from './model-column';
import { MODEL_CATALOG, getDefaultModelId, getModelById } from '@/lib/ai/model-catalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MAX_SELECTED = 4;

type CompareShellProps = {
  chatId: string;
};

export function CompareShell({ chatId }: CompareShellProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([
    getDefaultModelId(),
    MODEL_CATALOG[1]?.id ?? getDefaultModelId(),
  ]);
  const [outputs, setOutputs] = useState<Record<string, { text: string; error?: string }>>({});
  const [streaming, setStreaming] = useState(false);
  const [streamingModels, setStreamingModels] = useState<Set<string>>(new Set());
  const [branchIds, setBranchIds] = useState<Record<string, string>>({});
  const [continueStreaming, setContinueStreaming] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/compare?chatId=${encodeURIComponent(chatId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const b of data.branches ?? []) {
        map[b.modelKey] = b.id;
      }
      setBranchIds((prev) => ({ ...prev, ...map }));
    } catch {
      // ignore
    }
  }, [chatId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const toggleModel = useCallback((modelId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, modelId];
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = prompt.trim();
      if (!text || selectedIds.length === 0) return;

      setGlobalError(null);
      setStreaming(true);
      setStreamingModels(new Set(selectedIds));
      setOutputs((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          next[id] = { text: '' };
        });
        return next;
      });

      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            prompt: text,
            selectedModels: selectedIds,
          }),
        });
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res));
        }
        if (!res.body) throw new Error('No body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  const formatted = formatAiErrorMessage(data.error);
                  setOutputs((o) => ({ ...o, [data.modelKey]: { ...o[data.modelKey], error: formatted } }));
                  setStreamingModels((s) => {
                    const n = new Set(s);
                    n.delete(data.modelKey);
                    return n;
                  });
                  continue;
                }
                if (data.type === 'delta' && data.delta !== undefined) {
                  setOutputs((o) => ({
                    ...o,
                    [data.modelKey]: { ...o[data.modelKey], text: (o[data.modelKey]?.text ?? '') + data.delta },
                  }));
                }
                if (data.type === 'done') {
                  setStreamingModels((s) => {
                    const n = new Set(s);
                    n.delete(data.modelKey);
                    return n;
                  });
                  fetchBranches();
                }
              } catch {
                // skip invalid JSON
              }
            }
          }
        }
      } catch (err) {
        const message = formatAiErrorMessage(err);
        setGlobalError(message);
        setOutputs((o) => {
          const next = { ...o };
          selectedIds.forEach((id) => {
            next[id] = { ...next[id], error: message };
          });
          return next;
        });
      } finally {
        setStreaming(false);
        setStreamingModels(new Set());
      }
    },
    [chatId, prompt, selectedIds, fetchBranches]
  );

  const handlePromote = useCallback(
    async (modelKey: string) => {
      const text = outputs[modelKey]?.text;
      if (!text) return;
      try {
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'chat', promotedText: text }),
        });
        const data = await res.json();
        if (data.chatId) router.push(`/app/chat/${data.chatId}`);
      } catch {
        navigator.clipboard?.writeText(text);
      }
    },
    [outputs, router]
  );

  const handleContinue = useCallback(
    async (branchId: string, continuePrompt: string) => {
      const modelKey = Object.entries(branchIds).find(([, id]) => id === branchId)?.[0];
      if (!modelKey) return;
      setGlobalError(null);
      setOutputs((o) => ({ ...o, [modelKey]: { ...o[modelKey], error: undefined } }));
      setContinueStreaming((prev) => ({ ...prev, [modelKey]: '' }));
      try {
        const res = await fetch('/api/compare/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branchId, prompt: continuePrompt }),
        });
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res));
        }
        if (!res.body) throw new Error('No body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setContinueStreaming((prev) => ({ ...prev, [modelKey]: full }));
        }
        setOutputs((o) => ({
          ...o,
          [modelKey]: { text: (o[modelKey]?.text ?? '') + (o[modelKey]?.text ? '\n\n---\n\n' : '') + full },
        }));
      } catch (err) {
        const message = formatAiErrorMessage(err);
        setOutputs((o) => ({ ...o, [modelKey]: { ...o[modelKey], error: message } }));
      } finally {
        setContinueStreaming((prev) => {
          const next = { ...prev };
          delete next[modelKey];
          return next;
        });
      }
    },
    [branchIds]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center gap-2">
          <GitCompare className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Compare models</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select 2–{MAX_SELECTED} models and send one prompt to see responses side by side.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a prompt to send to all selected models..."
                rows={3}
                disabled={streaming}
                className={cn(
                  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm',
                  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  'disabled:opacity-50 dark:bg-input/30'
                )}
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">
                Models ({selectedIds.length}/{MAX_SELECTED})
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.map((id) => {
                  const model = getModelById(id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-primary/20"
                    >
                      {model?.label ?? id}
                      <button
                        type="button"
                        onClick={() => toggleModel(id)}
                        disabled={streaming}
                        className="rounded-full p-0.5 hover:bg-primary/20 disabled:opacity-50"
                        aria-label={`Remove ${model?.label ?? id} from comparison`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  );
                })}
                <Popover>
                  <PopoverTrigger
                    className={cn(
                      'inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-input bg-transparent px-2.5 text-sm',
                      'hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
                      'dark:bg-input/30 dark:hover:bg-input/50'
                    )}
                    disabled={streaming || selectedIds.length >= MAX_SELECTED}
                  >
                    <Plus className="size-4" />
                    Add model
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-0">
                    <div className="max-h-60 overflow-y-auto py-1">
                      {MODEL_CATALOG.map((m) => (
                        <label
                          key={m.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition hover:bg-muted',
                            streaming && 'pointer-events-none opacity-60'
                          )}
                        >
                          <Checkbox
                            checked={selectedIds.includes(m.id)}
                            onCheckedChange={() => toggleModel(m.id)}
                            disabled={
                              streaming ||
                              (!selectedIds.includes(m.id) &&
                                selectedIds.length >= MAX_SELECTED)
                            }
                            aria-label={m.label}
                          />
                          <span className="truncate">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedIds.length > 0
                    ? 'Comparing:'
                    : 'Select models above to compare'}
                </span>
                {selectedIds.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} of {MAX_SELECTED} selected
                  </span>
                )}
              </div>
              <Button
                type="submit"
                disabled={
                  streaming ||
                  !prompt.trim() ||
                  selectedIds.length === 0 ||
                  selectedIds.length < 2
                }
                className="shrink-0"
              >
                <GitCompare className="size-4" />
                {streaming ? 'Streaming…' : 'Compare'}
              </Button>
            </div>
          </form>

          {globalError && (
            <div className="mx-auto mt-6 max-w-5xl rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="font-medium">Compare request failed</div>
              <div className="mt-1">{globalError}</div>
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (Object.keys(outputs).length > 0 || streaming) && (
          <div className="mx-auto mt-8 w-full max-w-5xl flex-1 overflow-hidden">
            <div className="grid h-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedIds.map((modelKey) => (
                <ModelColumn
                  key={modelKey}
                  modelKey={modelKey}
                  branchId={branchIds[modelKey]}
                  output={
                    (outputs[modelKey]?.text ?? '') +
                    (continueStreaming[modelKey] ? '\n\n---\n\n' + continueStreaming[modelKey] : '')
                  }
                  isStreaming={streamingModels.has(modelKey) || !!continueStreaming[modelKey]}
                  error={outputs[modelKey]?.error}
                  onPromote={() => handlePromote(modelKey)}
                  onContinue={handleContinue}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
