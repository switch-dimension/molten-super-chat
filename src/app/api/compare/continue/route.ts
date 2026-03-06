import { streamText } from 'ai';
import { registry } from '@/lib/ai/provider-registry';
import { getCompareBranchWithMessages, appendCompareMessage } from '@/lib/db/compare';

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const { branchId, prompt } = body as { branchId?: string; prompt?: string };

  if (!branchId || !prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'Missing branchId or prompt' }, { status: 400 });
  }

  const branchWithMessages = await getCompareBranchWithMessages(branchId);
  if (!branchWithMessages) {
    return Response.json({ error: 'Branch not found' }, { status: 404 });
  }

  const model = registry.languageModel(
    branchWithMessages.modelKey as `openai:${string}` | `anthropic:${string}` | `google:${string}`
  );

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = branchWithMessages.messages
    .map((m) => {
      const parts = Array.isArray(m.parts) ? m.parts : [{ type: 'text' as const, text: String(m.parts) }];
      const text = parts.map((p) => (p && typeof p === 'object' && 'text' in p ? p.text : '')).join('');
      return { role: m.role as 'user' | 'assistant' | 'system', content: text };
    })
    .filter((m) => m.content);

  messages.push({ role: 'user', content: prompt });

  await appendCompareMessage(branchId, 'user', [{ type: 'text', text: prompt }]).catch(() => {});

  const result = streamText({
    model,
    messages,
    onFinish: async ({ text }) => {
      await appendCompareMessage(branchId, 'assistant', [{ type: 'text', text }]).catch(() => {});
    },
  });

  return result.toTextStreamResponse();
}
