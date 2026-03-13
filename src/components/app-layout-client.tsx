'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { useSidebar } from '@/components/sidebar-context';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, toggle } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <div
        className={cn(
          'shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out',
          isOpen ? 'w-56' : 'w-0'
        )}
      >
        <AppSidebar />
      </div>
      <main className="min-w-0 flex-1 flex flex-col relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="absolute left-2 top-2 z-10 size-8 shrink-0"
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          title={isOpen ? 'Close sidebar (Ctrl+B)' : 'Open sidebar (Ctrl+B)'}
        >
          <PanelLeft className="size-4" />
        </Button>
        {children}
      </main>
    </div>
  );
}
