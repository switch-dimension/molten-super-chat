'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type ChatThread = {
  id: string;
  mode: 'chat' | 'compare';
  title: string;
  updatedAt: string;
};

export function AppSidebar() {
  const pathname = usePathname();
  const [threads, setThreads] = useState<ChatThread[]>([]);

  useEffect(() => {
    fetch('/api/chats')
      .then((res) => res.json())
      .then((data: { chats?: ChatThread[] }) => setThreads(data.chats ?? []))
      .catch(() => setThreads([]));
  }, [pathname]); // refetch when navigating so new chats appear

  const chatId = pathname.startsWith('/chat/')
    ? pathname.slice('/chat/'.length)
    : pathname.startsWith('/compare/')
      ? pathname.slice('/compare/'.length)
      : null;
  const isNewChat = pathname === '/chat/new';
  const isNewCompare = pathname === '/compare/new';

  const isHome = pathname === '/';

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
        <Link
          href="/"
          className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
            isHome
              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
              : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          Molten Super Chat
        </Link>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <Link
          href="/chat/new"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            isNewChat
              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
          }`}
        >
          New chat
        </Link>
        <Link
          href="/compare/new"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            isNewCompare
              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
          }`}
        >
          Compare models
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="mt-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Threads
        </div>
        <ul className="mt-1 space-y-0.5">
          {threads.map((t) => {
            const href = t.mode === 'chat' ? `/chat/${t.id}` : `/compare/${t.id}`;
            const isActive = chatId === t.id;
            const label = t.title || (t.mode === 'chat' ? 'Chat' : 'Compare');
            return (
              <li key={t.id}>
                <Link
                  href={href}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                  }`}
                  title={label}
                >
                  <span className="truncate block">{label}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {t.mode === 'chat' ? 'Chat' : 'Compare'}
                  </span>
                </Link>
              </li>
            );
          })}
          {threads.length === 0 && (
            <li className="px-3 py-4 text-sm text-zinc-400 dark:text-zinc-500">
              No threads yet
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
