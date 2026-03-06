'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useMemo, useState } from 'react';
import { ModelPicker } from './model-picker';
import { getDefaultModelId } from '@/lib/ai/model-catalog';

type ChatShellProps = {
  chatId: string;
  initialMessages?: Array<{ id: string; role: string; parts: Array<{ type: string; text?: string }> }>;
};

function MessageParts({ parts }: { parts: Array<{ type: string; text?: string }> }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'text' && part.text) {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {part.text}
            </span>
          );
        }
        return null;
      })}
    </>
  );
}

export function ChatShell({ chatId, initialMessages = [] }: ChatShellProps) {
  const [selectedModel, setSelectedModel] = useState(getDefaultModelId());

  const uiMessages = useMemo(() => {
    return initialMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      parts: m.parts as Array<{ type: 'text'; text: string }>,
    }));
  }, [initialMessages]);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    messages: uiMessages.length > 0 ? uiMessages : undefined,
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const input = form.querySelector<HTMLInputElement>('input[name="message"]');
      const text = input?.value?.trim();
      if (!text) return;
      sendMessage({ text }, { body: { selectedModel } });
      if (input) input.value = '';
    },
    [sendMessage, selectedModel]
  );

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Chat</h1>
          <ModelPicker value={selectedModel} onChange={setSelectedModel} disabled={status === 'streaming'} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && (
            <p className="py-12 text-center text-zinc-500 dark:text-zinc-400">
              Send a message to start the conversation.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'ml-8 bg-zinc-200 dark:bg-zinc-700'
                  : 'mr-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </span>
              <div className="mt-1 text-zinc-900 dark:text-zinc-100">
                <MessageParts parts={message.parts as Array<{ type: string; text?: string }>} />
              </div>
            </div>
          ))}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error.message}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
          <input
            name="message"
            type="text"
            placeholder="Message..."
            disabled={status === 'streaming'}
            className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
          {status === 'streaming' ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-lg bg-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          )}
        </form>
      </footer>
    </div>
  );
}
