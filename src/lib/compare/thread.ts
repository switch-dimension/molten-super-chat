export type ThreadTurn = {
  user: string;
  assistant: string;
  error?: string;
};

export type CompareRoundLike = {
  prompt: string;
  models: string[];
  outputs: Record<string, { text: string; error?: string }>;
};

/** User/assistant turns for one model across all rounds where it participated. */
export function buildThreadForModel(rounds: CompareRoundLike[], modelKey: string): ThreadTurn[] {
  return rounds
    .filter((r) => r.models.includes(modelKey))
    .map((r) => ({
      user: r.prompt,
      assistant: r.outputs[modelKey]?.text ?? '',
      error: r.outputs[modelKey]?.error,
    }));
}
