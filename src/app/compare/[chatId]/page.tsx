import { redirect } from 'next/navigation';
import { CompareShell } from '@/components/compare/compare-shell';

type PageProps = { params: Promise<{ chatId: string }> };

export default async function ComparePage({ params }: PageProps) {
  const { chatId } = await params;
  if (chatId === 'new') {
    redirect(`/compare/${crypto.randomUUID()}`);
  }

  return (
    <div className="flex h-screen flex-col">
      <CompareShell chatId={chatId} />
    </div>
  );
}
