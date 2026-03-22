import { redirect } from 'next/navigation';
import { ChatShell } from '@/components/chat/chat-shell';
import { getChatWithMessages } from '@/lib/db/chats';

type PageProps = { params: Promise<{ chatId: string }> };

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;
  if (chatId === 'new') {
    redirect('/app/compare/new');
  }

  let initialMessages: Array<{ id: string; role: string; parts: Array<{ type: string; text?: string }> }> = [];
  try {
    const data = await getChatWithMessages(chatId);
    if (data?.messages?.length) {
      initialMessages = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: Array.isArray(m.parts) ? (m.parts as Array<{ type: string; text?: string }>) : [{ type: 'text', text: '' }],
      }));
    }
  } catch {
    // no DB or missing env - start empty
  }

  return (
    <div className="flex h-screen flex-col">
      <ChatShell key={chatId} chatId={chatId} initialMessages={initialMessages} />
    </div>
  );
}
