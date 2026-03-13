'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useMemo, useState } from 'react';
import { Send, Square } from 'lucide-react';
import { formatAiErrorMessage } from '@/lib/ai/error-message';
import { ModelPicker } from './model-picker';
import { getDefaultModelId } from '@/lib/ai/model-catalog';
import { MemoizedMarkdown } from '@/components/ui/memoized-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ChatShellProps = {
  chatId: string;
  initialMessages?: Array<{ id: string; role: string; parts: Array<{ type: string; text?: string }> }>;
};

function MessageParts({
  parts,
  messageId,
  renderMarkdown,
}: {
  parts: Array<{ type: string; text?: string }>;
  messageId: string;
  renderMarkdown: boolean;
}) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'text' && part.text !== undefined) {
          if (renderMarkdown) {
            return (
              <MemoizedMarkdown
                key={`${messageId}-${i}`}
                id={`${messageId}-${i}`}
                content={part.text}
              />
            );
          }
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
    <div className="flex h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-foreground">Chat</h1>
          <ModelPicker value={selectedModel} onChange={setSelectedModel} disabled={status === 'streaming'} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              Send a message to start the conversation.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'ml-8 bg-muted'
                  : 'mr-8 border border-border bg-card'
              }`}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </span>
              <div className="mt-1 text-foreground">
                <MessageParts
                  parts={message.parts as Array<{ type: string; text?: string }>}
                  messageId={message.id}
                  renderMarkdown={message.role === 'assistant'}
                />
              </div>
            </div>
          ))}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="font-medium">Chat request failed</div>
              <div className="mt-1">{formatAiErrorMessage(error)}</div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-border bg-card p-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
          <Input
            name="message"
            type="text"
            placeholder="Message..."
            disabled={status === 'streaming'}
            className="flex-1"
          />
          {status === 'streaming' ? (
            <Button type="button" variant="secondary" onClick={() => stop()}>
              <Square className="size-4" />
              Stop
            </Button>
          ) : (
            <Button type="submit">
              <Send className="size-4" />
              Send
            </Button>
          )}
        </form>
      </footer>
    </div>
  );
}
