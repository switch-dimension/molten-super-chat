import { streamCompareResponse, clampCompareModels } from '@/lib/ai/compare';
import { formatAiErrorMessage } from '@/lib/ai/error-message';
import { ensureChat } from '@/lib/db/chats';
import { ensureCompareBranches, appendCompareMessage, getCompareChatWithBranches } from '@/lib/db/compare';

export const maxDuration = 120;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  if (!chatId) {
    return Response.json({ error: 'Missing chatId' }, { status: 400 });
  }
  try {
    const branches = await getCompareChatWithBranches(chatId);
    return Response.json({
      branches: branches.map((b) => ({
        id: b.id,
        modelKey: b.modelKey,
        label: b.label,
        messages: b.messages.map((m) => ({ role: m.role, parts: m.parts })),
      })),
    });
  } catch {
    return Response.json({ branches: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, prompt, selectedModels = [] } = body as {
      chatId?: string;
      prompt?: string;
      selectedModels?: string[];
    };

    if (!prompt || typeof prompt !== 'string' || !Array.isArray(selectedModels) || selectedModels.length === 0) {
      return Response.json(
        { error: 'Missing or invalid prompt or selectedModels' },
        { status: 400 }
      );
    }

    const id = chatId ?? crypto.randomUUID();
    await ensureChat(id, 'compare').catch(() => {});

    const ids = clampCompareModels(selectedModels);
    const branches = await ensureCompareBranches(id, ids).catch(() => []);
    const modelToBranchId = new Map(branches.map((b) => [b.modelKey, b.id]));

    for (const modelKey of ids) {
      const branchId = modelToBranchId.get(modelKey);
      if (branchId) {
        await appendCompareMessage(branchId, 'user', [{ type: 'text', text: prompt }]).catch(() => {});
      }
    }

    const stream = await streamCompareResponse({
      prompt,
      modelIds: selectedModels,
      onFinish: async (results) => {
        for (const { modelKey, text } of results) {
          const branchId = modelToBranchId.get(modelKey);
          if (branchId) {
            await appendCompareMessage(branchId, 'assistant', [{ type: 'text', text }]).catch(() => {});
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json({ error: formatAiErrorMessage(error) }, { status: 500 });
  }
}
