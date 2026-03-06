import { eq, asc, and } from 'drizzle-orm';
import { db } from './index';
import { compareBranches, compareMessages, type NewCompareBranch, type NewCompareMessage } from './schema';

export async function getCompareBranches(chatId: string) {
  return db
    .select()
    .from(compareBranches)
    .where(eq(compareBranches.chatId, chatId))
    .orderBy(asc(compareBranches.sortOrder));
}

export async function getCompareBranchWithMessages(branchId: string) {
  const [branch] = await db.select().from(compareBranches).where(eq(compareBranches.id, branchId)).limit(1);
  if (!branch) return null;
  const messages = await db
    .select()
    .from(compareMessages)
    .where(eq(compareMessages.branchId, branchId))
    .orderBy(compareMessages.createdAt);
  return { ...branch, messages };
}

export async function getCompareChatWithBranches(chatId: string) {
  const branches = await getCompareBranches(chatId);
  const withMessages = await Promise.all(
    branches.map((b) => getCompareBranchWithMessages(b.id))
  );
  return withMessages.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getCompareBranchWithMessages>>>[];
}

export async function ensureCompareBranches(
  chatId: string,
  modelKeys: string[],
  labels?: Record<string, string>
) {
  const existing = await getCompareBranches(chatId);
  const existingKeys = new Set(existing.map((b) => b.modelKey));
  const toCreate = modelKeys.filter((k) => !existingKeys.has(k));
  const catalog = await import('@/lib/ai/model-catalog').then((m) => m.MODEL_CATALOG);
  for (let i = 0; i < toCreate.length; i++) {
    const modelKey = toCreate[i]!;
    const label = labels?.[modelKey] ?? catalog.find((c) => c.id === modelKey)?.label ?? modelKey;
    await db.insert(compareBranches).values({
      chatId,
      modelKey,
      label,
      sortOrder: existing.length + i,
    });
  }
  return getCompareBranches(chatId);
}

export async function appendCompareMessage(
  branchId: string,
  role: 'user' | 'assistant',
  parts: unknown
) {
  await db.insert(compareMessages).values({
    branchId,
    role,
    parts: parts as NewCompareMessage['parts'],
  });
}

export async function getBranchIdByChatAndModel(chatId: string, modelKey: string) {
  const [row] = await db
    .select({ id: compareBranches.id })
    .from(compareBranches)
    .where(and(eq(compareBranches.chatId, chatId), eq(compareBranches.modelKey, modelKey)))
    .limit(1);
  return row?.id ?? null;
}
