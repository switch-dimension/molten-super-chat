'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { MessageSquare, LayoutList, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/sidebar-context';
import { Button } from '@/components/ui/button';

type ChatThread = {
  id: string;
  mode: 'chat' | 'compare';
  title: string;
  updatedAt: string;
};

export function AppSidebar() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [threads, setThreads] = useState<ChatThread[]>([]);

  useEffect(() => {
    fetch('/api/chats')
      .then((res) => res.json())
      .then((data: { chats?: ChatThread[] }) => setThreads(data.chats ?? []))
      .catch(() => setThreads([]));
  }, [pathname]); // refetch when navigating so new chats appear

  const chatId = pathname.startsWith('/app/chat/')
    ? pathname.slice('/app/chat/'.length)
    : pathname.startsWith('/app/compare/')
      ? pathname.slice('/app/compare/'.length)
      : null;
  const isNewChat = pathname === '/app/compare/new';

  const isAppHome = pathname === '/app';

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
      active
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    );

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-1 border-b border-sidebar-border p-2">
        <Link
          href="/app"
          className={cn(linkClass(isAppHome), 'min-w-0 flex-1')}
        >
          Molten Super Chat
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="size-7 shrink-0"
          aria-label="Close sidebar"
          title="Close sidebar (Ctrl+B)"
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <Link href="/app/compare/new" className={linkClass(isNewChat)}>
          <MessageSquare className="size-4" />
          New chat
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="mt-2 flex items-center gap-1.5 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <LayoutList className="size-3.5" />
          Work
        </div>
        <ul className="mt-1 space-y-0.5">
          {threads.map((t) => {
            const href = t.mode === 'chat' ? `/app/chat/${t.id}` : `/app/compare/${t.id}`;
            const isActive = chatId === t.id;
            const label = t.title || 'Chat';
            return (
              <li key={t.id}>
                <Link
                  href={href}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  title={label}
                >
                  <span className="block truncate">{label}</span>
                  {t.mode === 'chat' && (
                    <span className="text-xs text-muted-foreground">Single-model (legacy)</span>
                  )}
                </Link>
              </li>
            );
          })}
          {threads.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              No threads yet
            </li>
          )}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center justify-center">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'size-8',
              },
            }}
          />
        </div>
      </div>
    </aside>
  );
}
