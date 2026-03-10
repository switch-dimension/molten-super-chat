import { type UIMessage } from 'ai';
import { formatAiErrorMessage } from '@/lib/ai/error-message';
import { streamChatResponse } from '@/lib/ai/chat';
import { ensureChat, appendChatMessage, getChatWithMessages } from '@/lib/db/chats';

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  if (!chatId) {
    return Response.json({ error: 'Missing chatId' }, { status: 400 });
  }
  const data = await getChatWithMessages(chatId);
  if (!data) {
    return Response.json({ chat: null, messages: [] });
  }
  const messages: UIMessage[] = data.messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    parts: Array.isArray(m.parts) ? m.parts : [{ type: 'text' as const, text: String(m.parts) }],
  }));
  return Response.json({ chat: { id: data.id, title: data.title, mode: data.mode }, messages });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id: chatId, messages = [], trigger, messageId } = body as {
      id?: string;
      messages?: UIMessage[];
      trigger?: string;
      messageId?: string;
    };
    const selectedModel = body.selectedModel as string | undefined;

    if (!chatId || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Missing id or messages' }, { status: 400 });
    }

    const modelId = selectedModel ?? 'openai:gpt-4o';

    await ensureChat(chatId, 'chat');

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      const parts = 'parts' in lastMessage ? lastMessage.parts : [{ type: 'text' as const, text: String(lastMessage) }];
      await appendChatMessage(chatId, 'user', parts);
    }

    const result = await streamChatResponse({
      messages,
      modelId,
      onFinish: async ({ text }) => {
        await appendChatMessage(chatId, 'assistant', [{ type: 'text', text }]);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return Response.json({ error: formatAiErrorMessage(error) }, { status: 500 });
  }
}
