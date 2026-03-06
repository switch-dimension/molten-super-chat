import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';

/**
 * POST: create a new chat. Used for "Promote to chat" from compare.
 * Body: { mode: 'chat' | 'compare', promotedText?: string }
 * Returns: { chatId }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { mode = 'chat', promotedText } = body as { mode?: 'chat' | 'compare'; promotedText?: string };

  const [chat] = await db.insert(chats).values({ mode, title: 'New chat' }).returning({ id: chats.id });
  if (!chat) {
    return Response.json({ error: 'Failed to create chat' }, { status: 500 });
  }

  if (promotedText && mode === 'chat') {
    const { appendChatMessage } = await import('@/lib/db/chats');
    await appendChatMessage(chat.id, 'assistant', [{ type: 'text', text: promotedText }]);
  }

  return Response.json({ chatId: chat.id });
}
