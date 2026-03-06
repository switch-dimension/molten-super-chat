import { eq, desc } from 'drizzle-orm';
import { db } from './index';
import { chats, chatMessages, type NewChat, type NewChatMessage } from './schema';

export async function getChat(id: string) {
  const [chat] = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
  return chat ?? null;
}

export async function getChatWithMessages(id: string) {
  const chat = await getChat(id);
  if (!chat) return null;
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, id))
    .orderBy(chatMessages.createdAt);
  return { ...chat, messages };
}

export async function ensureChat(id: string, mode: 'chat' | 'compare', title = 'New chat') {
  const existing = await getChat(id);
  if (existing) {
    await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, id));
    return existing.id;
  }
  await db.insert(chats).values({ id, mode, title });
  return id;
}

export async function appendChatMessage(
  chatId: string,
  role: 'user' | 'assistant' | 'system',
  parts: unknown
) {
  const [row] = await db
    .insert(chatMessages)
    .values({ chatId, role, parts: parts as NewChatMessage['parts'] })
    .returning({ id: chatMessages.id });
  return row?.id ?? null;
}

export async function updateChatTitle(chatId: string, title: string) {
  await db.update(chats).set({ title, updatedAt: new Date() }).where(eq(chats.id, chatId));
}

export async function listChats(limit = 50) {
  return db.select().from(chats).orderBy(desc(chats.updatedAt)).limit(limit);
}
