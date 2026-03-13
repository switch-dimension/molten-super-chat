import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/sidebar-context';
import { AppLayoutClient } from '@/components/app-layout-client';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppLayoutClient>{children}</AppLayoutClient>
    </SidebarProvider>
  );
}
