'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useMemo, useState } from 'react';
import { Send, Square, Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
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

type MessagePart =
  | { type: 'text'; text?: string }
  | {
      type: `tool-${string}`;
      toolCallId: string;
      state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
      input?: { query?: string };
      output?: {
        answer?: string | null;
        results?: Array<{ title: string; url: string; content: string }>;
        error?: string;
      };
      errorText?: string;
    };

function WebSearchToolPart({
  part,
  messageId,
  index,
}: {
  part: Extract<MessagePart, { type: `tool-${string}` }>;
  messageId: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return (
      <div
        key={`${messageId}-${index}`}
        className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
      >
        <Search className="size-4 shrink-0 animate-pulse" />
        <span>Searching the web...</span>
      </div>
    );
  }
  if (part.state === 'output-error') {
    return (
      <div
        key={`${messageId}-${index}`}
        className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        Web search failed: {part.errorText ?? part.output?.error ?? 'Unknown error'}
      </div>
    );
  }
  const results = part.output?.results ?? [];
  if (results.length === 0) return null;
  return (
    <div key={`${messageId}-${index}`} className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80"
      >
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        <span>Sources ({results.length})</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-2 pl-2">
          {results.map((r, j) => (
            <li key={j} className="text-sm">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-primary underline hover:no-underline"
              >
                <ExternalLink className="mt-0.5 size-3 shrink-0" />
                <span>{r.title || r.url}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageParts({
  parts,
  messageId,
  renderMarkdown,
}: {
  parts: MessagePart[];
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
        if (part.type.startsWith('tool-')) {
          return (
            <WebSearchToolPart
              key={`${messageId}-${i}`}
              part={part as Extract<MessagePart, { type: `tool-${string}` }>}
              messageId={messageId}
              index={i}
            />
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
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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
                  parts={message.parts as MessagePart[]}
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
