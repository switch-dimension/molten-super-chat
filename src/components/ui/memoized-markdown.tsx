'use client';

import { lexer } from 'marked';
import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Splits markdown into blocks so we can memoize per block and avoid
 * re-rendering the whole message on every streamed token.
 * @see https://sdk.vercel.ai/cookbook/next/markdown-chatbot-with-memoization
 */
function parseMarkdownIntoBlocks(markdown: string): string[] {
  if (!markdown.trim()) return [];
  try {
    const tokens = lexer(markdown);
    return tokens.map((token) => (token as { raw: string }).raw);
  } catch {
    return [markdown];
  }
}

const markdownComponents = {
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="overflow-x-auto rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
      {children}
    </pre>
  ),
  code: ({
    className,
    children,
    ...props
  }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-2">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-base font-bold mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-zinc-300 pl-3 my-2 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  a: ({
    href,
    children,
  }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline dark:text-blue-400 hover:no-underline"
    >
      {children}
    </a>
  ),
  // GFM tables (requires remark-gfm)
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full min-w-[240px] border-collapse border border-zinc-200 dark:border-zinc-600 text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-zinc-100 dark:bg-zinc-700">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
      {children}
    </tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-zinc-200 dark:border-zinc-600">
      {children}
    </tr>
  ),
  th: ({
    children,
    style,
  }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
    <th
      className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-900 dark:border-zinc-600 dark:text-zinc-100"
      style={style}
    >
      {children}
    </th>
  ),
  td: ({
    children,
    style,
  }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
    <td
      className="border border-zinc-200 px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
      style={style}
    >
      {children}
    </td>
  ),
};

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    if (blocks.length === 0) {
      return null;
    }

    return (
      <>
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock
            content={block}
            key={`${id}-block_${index}`}
          />
        ))}
      </>
    );
  }
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown';
