'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompare, Plus, Search, X, Send } from 'lucide-react';
import { formatAiErrorMessage, getApiErrorMessage } from '@/lib/ai/error-message';
import { ModelColumn } from './model-column';
import { MODEL_CATALOG, getDefaultCompareModelIds, getModelById } from '@/lib/ai/model-catalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MAX_SELECTED = 4;

type CompareRound = {
  id: string;
  prompt: string;
  models: string[];
  outputs: Record<string, { text: string; error?: string }>;
  streaming: boolean;
};

type CompareShellProps = {
  chatId: string;
};

function buildContextualPrompt(userPrompt: string, previousRound: CompareRound): string {
  const context = previousRound.models
    .map((id) => {
      const label = getModelById(id)?.label ?? id;
      const text = previousRound.outputs[id]?.text ?? '(no response)';
      return `[${label}]:\n${text}`;
    })
    .join('\n\n');
  return `Here are the responses from the previous comparison:\n\n${context}\n\n---\n\nUser's follow-up: ${userPrompt}`;
}

export function CompareShell({ chatId }: CompareShellProps) {
  const router = useRouter();
  const [rounds, setRounds] = useState<CompareRound[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(getDefaultCompareModelIds());
  const [inputText, setInputText] = useState('');
  const [branchIds, setBranchIds] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const restoredRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/compare?chatId=${encodeURIComponent(chatId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const branches: Array<{
        id: string;
        modelKey: string;
        label: string;
        messages: Array<{ role: string; parts: Array<{ type: string; text?: string }> }>;
      }> = data.branches ?? [];
      if (branches.length === 0) return;

      const idMap: Record<string, string> = {};
      for (const b of branches) {
        idMap[b.modelKey] = b.id;
      }
      setBranchIds((prev) => ({ ...prev, ...idMap }));

      if (!restoredRef.current) {
        restoredRef.current = true;
        const restoredModels = branches.map((b) => b.modelKey);
        if (restoredModels.length > 0) setSelectedIds(restoredModels);

        const restoredRounds: CompareRound[] = [];
        let maxPairs = 0;
        const pairsByBranch = new Map<
          string,
          Array<{ userText: string; assistantText: string }>
        >();
        for (const b of branches) {
          const pairs: Array<{ userText: string; assistantText: string }> = [];
          const msgs = b.messages ?? [];
          for (let i = 0; i + 1 < msgs.length; i += 2) {
            const userMsg = msgs[i];
            const assistantMsg = msgs[i + 1];
            if (userMsg?.role !== 'user' || assistantMsg?.role !== 'assistant') continue;
            const userParts = Array.isArray(userMsg.parts) ? userMsg.parts : [];
            const assistantParts = Array.isArray(assistantMsg.parts) ? assistantMsg.parts : [];
            const userText = userParts
              .filter((p) => p.type === 'text' && p.text)
              .map((p) => (p as { text: string }).text)
              .join('\n');
            const assistantText = assistantParts
              .filter((p) => p.type === 'text' && p.text)
              .map((p) => (p as { text: string }).text)
              .join('\n\n---\n\n');
            pairs.push({ userText, assistantText });
          }
          pairsByBranch.set(b.modelKey, pairs);
          maxPairs = Math.max(maxPairs, pairs.length);
        }
        for (let r = 0; r < maxPairs; r++) {
          let prompt = '';
          const outputs: Record<string, { text: string }> = {};
          const models: string[] = [];
          for (const b of branches) {
            const pairs = pairsByBranch.get(b.modelKey) ?? [];
            const pair = pairs[r];
            if (!pair) continue;
            if (!prompt) prompt = pair.userText;
            outputs[b.modelKey] = { text: pair.assistantText };
            models.push(b.modelKey);
          }
          if (prompt || Object.keys(outputs).length > 0) {
            restoredRounds.push({
              id: crypto.randomUUID(),
              prompt,
              models,
              outputs,
              streaming: false,
            });
          }
        }
        if (restoredRounds.length > 0) setRounds(restoredRounds);
      }
    } catch {
      // ignore
    }
  }, [chatId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rounds]);

  const toggleModel = useCallback((modelId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(modelId)) return prev.filter((id) => id !== modelId);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, modelId];
    });
  }, []);

  const isStreaming = rounds.some((r) => r.streaming);

  const handleSubmitInitial = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputText.trim();
      if (!text || selectedIds.length < 2) return;

      setGlobalError(null);
      setInputText('');
      const roundId = crypto.randomUUID();
      const newRound: CompareRound = {
        id: roundId,
        prompt: text,
        models: [...selectedIds],
        outputs: Object.fromEntries(selectedIds.map((id) => [id, { text: '' }])),
        streaming: true,
      };
      setRounds((prev) => [...prev, newRound]);

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
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
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
                  setRounds((prev) =>
                    prev.map((r) =>
                      r.id === roundId
                        ? {
                            ...r,
                            outputs: {
                              ...r.outputs,
                              [data.modelKey]: { ...r.outputs[data.modelKey], error: formatted },
                            },
                          }
                        : r
                    )
                  );
                  continue;
                }
                if (data.type === 'delta' && data.delta !== undefined) {
                  setRounds((prev) =>
                    prev.map((r) =>
                      r.id === roundId
                        ? {
                            ...r,
                            outputs: {
                              ...r.outputs,
                              [data.modelKey]: {
                                ...r.outputs[data.modelKey],
                                text: (r.outputs[data.modelKey]?.text ?? '') + data.delta,
                              },
                            },
                          }
                        : r
                    )
                  );
                }
                if (data.type === 'done') {
                  fetchBranches();
                }
              } catch {
                // skip
              }
            }
          }
        }
      } catch (err) {
        const message = formatAiErrorMessage(err);
        setGlobalError(message);
        setRounds((prev) =>
          prev.map((r) =>
            r.id === roundId
              ? {
                  ...r,
                  streaming: false,
                  outputs: Object.fromEntries(
                    r.models.map((id) => [
                      id,
                      { ...r.outputs[id], error: message, text: r.outputs[id]?.text ?? '' },
                    ])
                  ),
                }
              : r
          )
        );
      } finally {
        setRounds((prev) =>
          prev.map((r) => (r.id === roundId ? { ...r, streaming: false } : r))
        );
      }
    },
    [chatId, inputText, selectedIds, fetchBranches]
  );

  const handleSubmitFollowUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputText.trim();
      if (!text || selectedIds.length === 0 || rounds.length === 0) return;

      const lastRound = rounds[rounds.length - 1];
      const contextualPrompt = buildContextualPrompt(text, lastRound);

      setGlobalError(null);
      setInputText('');
      const roundId = crypto.randomUUID();
      const newRound: CompareRound = {
        id: roundId,
        prompt: text,
        models: [...selectedIds],
        outputs: Object.fromEntries(selectedIds.map((id) => [id, { text: '' }])),
        streaming: true,
      };
      setRounds((prev) => [...prev, newRound]);

      const runContinue = async (modelKey: string) => {
        const branchId = branchIds[modelKey];
        if (!branchId) return;
        try {
          const res = await fetch('/api/compare/continue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchId, prompt: contextualPrompt }),
          });
          if (!res.ok) {
            const errMsg = await getApiErrorMessage(res);
            setRounds((prev) =>
              prev.map((r) =>
                r.id === roundId
                  ? {
                      ...r,
                      outputs: {
                        ...r.outputs,
                        [modelKey]: { ...r.outputs[modelKey], error: errMsg },
                      },
                    }
                  : r
              )
            );
            return;
          }
          if (!res.body) return;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let full = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            full += decoder.decode(value, { stream: true });
            const current = full;
            setRounds((prev) =>
              prev.map((r) =>
                r.id === roundId
                  ? {
                      ...r,
                      outputs: {
                        ...r.outputs,
                        [modelKey]: { ...r.outputs[modelKey], text: current },
                      },
                    }
                  : r
              )
            );
          }
        } catch (err) {
          const message = formatAiErrorMessage(err);
          setRounds((prev) =>
            prev.map((r) =>
              r.id === roundId
                ? {
                    ...r,
                    outputs: {
                      ...r.outputs,
                      [modelKey]: { ...r.outputs[modelKey], error: message },
                    },
                  }
                : r
            )
          );
        }
      };

      await Promise.all(selectedIds.map(runContinue));
      setRounds((prev) =>
        prev.map((r) => (r.id === roundId ? { ...r, streaming: false } : r))
      );
      fetchBranches();
    },
    [chatId, inputText, selectedIds, rounds, branchIds, fetchBranches]
  );

  const handleSubmit = rounds.length === 0 ? handleSubmitInitial : handleSubmitFollowUp;

  const handlePromote = useCallback(
    (modelKey: string, roundIndex: number) => {
      const round = rounds[roundIndex];
      const text = round?.outputs[modelKey]?.text;
      if (!text) return;
      (async () => {
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
      })();
    },
    [rounds, router]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card px-4 py-2">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <GitCompare className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Compare models</h1>
          <span className="text-sm text-muted-foreground">
            Select 2–{MAX_SELECTED} models, then send a prompt. Use follow-ups to refine (e.g. “combine the opinions”).
          </span>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
          {rounds.map((round, idx) => (
            <div key={round.id} className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">You</span>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{round.prompt}</p>
              </div>
              <div className="grid h-[360px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {round.models.map((modelKey) => (
                  <ModelColumn
                    key={modelKey}
                    modelKey={modelKey}
                    output={round.outputs[modelKey]?.text ?? ''}
                    isStreaming={round.streaming}
                    error={round.outputs[modelKey]?.error}
                    onPromote={() => handlePromote(modelKey, idx)}
                  />
                ))}
              </div>
            </div>
          ))}
          {globalError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="font-medium">Compare request failed</div>
              <div className="mt-1">{globalError}</div>
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-card p-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-5xl flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Models ({selectedIds.length}/{MAX_SELECTED})
            </span>
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
                    disabled={isStreaming}
                    className="rounded-full p-0.5 hover:bg-primary/20 disabled:opacity-50"
                    aria-label={`Remove ${model?.label ?? id}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              );
            })}
            <Popover onOpenChange={(open) => open && setModelSearch('')}>
              <PopoverTrigger
                className={cn(
                  'inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-input bg-transparent px-2.5 text-sm',
                  'hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
                  'dark:bg-input/30 dark:hover:bg-input/50'
                )}
                disabled={isStreaming || selectedIds.length >= MAX_SELECTED}
              >
                <Plus className="size-4" />
                Add model
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-0">
                <div className="border-b border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Search className="size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search models..."
                      className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {MODEL_CATALOG.filter(
                    (m) =>
                      m.label.toLowerCase().includes(modelSearch.toLowerCase()) ||
                      m.provider.toLowerCase().includes(modelSearch.toLowerCase())
                  ).map((m) => (
                    <label
                      key={m.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition hover:bg-muted',
                        isStreaming && 'pointer-events-none opacity-60'
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.includes(m.id)}
                        onCheckedChange={() => toggleModel(m.id)}
                        disabled={
                          isStreaming ||
                          (!selectedIds.includes(m.id) && selectedIds.length >= MAX_SELECTED)
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
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                rounds.length === 0
                  ? 'Enter a prompt to send to all selected models...'
                  : 'Follow-up (e.g. combine the opinions into one)...'
              }
              disabled={isStreaming}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={
                isStreaming ||
                !inputText.trim() ||
                selectedIds.length === 0 ||
                (rounds.length === 0 && selectedIds.length < 2)
              }
            >
              <Send className="size-4" />
              {rounds.length === 0 ? 'Compare' : 'Send'}
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}
