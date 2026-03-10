import { streamText } from 'ai';
import { formatAiErrorMessage } from './error-message';
import { registry } from './provider-registry';
import { getModelById } from './model-catalog';

const MAX_COMPARE_MODELS = 4;

export type CompareStreamOptions = {
  prompt: string;
  modelIds: string[];
  onFinish?: (params: { modelKey: string; text: string }[]) => void | Promise<void>;
};

export function clampCompareModels(modelIds: string[]): string[] {
  const resolved = modelIds
    .slice(0, MAX_COMPARE_MODELS)
    .map((id) => getModelById(id)?.id ?? id);
  return [...new Set(resolved)];
}

/**
 * Streams responses from multiple models in parallel. The returned ReadableStream
 * emits SSE-like lines: each line is JSON { modelKey, type: 'delta' | 'done', delta?: string, text?: string }.
 */
export async function streamCompareResponse({
  prompt,
  modelIds,
  onFinish,
}: CompareStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const ids = clampCompareModels(modelIds);
  if (ids.length === 0) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ error: 'No models selected' }) + '\n\n'));
        controller.close();
      },
    });
  }

  const encoder = new TextEncoder();
  const results: { modelKey: string; text: string }[] = [];
  let completed = 0;

  function enqueue(obj: object) {
    return encoder.encode('data: ' + JSON.stringify(obj) + '\n\n');
  }

  return new ReadableStream({
    async start(controller) {
      const run = async (modelKey: string) => {
        const model = registry.languageModel(
          modelKey as `openai:${string}` | `anthropic:${string}` | `google:${string}`
        );
        const result = streamText({ model, prompt });
        let full = '';
        try {
          for await (const chunk of result.textStream) {
            full += chunk;
            controller.enqueue(enqueue({ modelKey, type: 'delta', delta: chunk }));
          }
          results.push({ modelKey, text: full });
        } catch (err) {
          const message = formatAiErrorMessage(err);
          controller.enqueue(enqueue({ modelKey, type: 'error', error: message }));
          results.push({ modelKey, text: '' });
        }
        completed++;
        controller.enqueue(enqueue({ modelKey, type: 'done', text: full }));
        if (completed === ids.length) {
          await onFinish?.(results);
          controller.close();
        }
      };

      ids.forEach((modelKey) => run(modelKey));
    },
  });
}
