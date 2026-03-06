import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { registry } from './provider-registry';
import { getModelById } from './model-catalog';

export type ChatStreamOptions = {
  messages: UIMessage[];
  modelId: string;
  onFinish?: (params: { text: string }) => void | Promise<void>;
};

export async function streamChatResponse({
  messages,
  modelId,
  onFinish,
}: ChatStreamOptions) {
  const catalogModel = getModelById(modelId);
  const resolvedId = catalogModel?.id ?? modelId;
  const model = registry.languageModel(
    resolvedId as `openai:${string}` | `anthropic:${string}` | `google:${string}`
  );

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
    onFinish: onFinish
      ? async (event) => {
          await onFinish({ text: event.text });
        }
      : undefined,
  });

  return result;
}
