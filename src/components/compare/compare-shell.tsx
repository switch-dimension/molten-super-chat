'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAiErrorMessage, getApiErrorMessage } from '@/lib/ai/error-message';
import { ModelColumn } from './model-column';
import { MODEL_CATALOG, getDefaultModelId } from '@/lib/ai/model-catalog';

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
        if (data.chatId) router.push(`/chat/${data.chatId}`);
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
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Compare models</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Select 2–{MAX_SELECTED} models and send one prompt to see responses side by side.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to send to all selected models..."
              rows={3}
              disabled={streaming}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Models ({selectedIds.length}/{MAX_SELECTED})
            </span>
            <div className="flex flex-wrap gap-2">
              {MODEL_CATALOG.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    selectedIds.includes(m.id)
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                  } ${streaming ? 'opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleModel(m.id)}
                    disabled={streaming || (!selectedIds.includes(m.id) && selectedIds.length >= MAX_SELECTED)}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={streaming || !prompt.trim() || selectedIds.length === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {streaming ? 'Streaming…' : 'Compare'}
          </button>
        </form>

        {globalError && (
          <div className="mx-auto mt-6 max-w-5xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <div className="font-medium">Compare request failed</div>
            <div className="mt-1">{globalError}</div>
          </div>
        )}

        {selectedIds.length > 0 && (Object.keys(outputs).length > 0 || streaming) && (
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        )}
      </div>
    </div>
  );
}
