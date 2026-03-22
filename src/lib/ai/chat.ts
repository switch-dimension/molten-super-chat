import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { registry } from './provider-registry';
import { getModelById } from './model-catalog';
import { webSearch } from './tools';

export type ChatStreamOptions = {
  messages: UIMessage[];
  modelId: string;
  onFinish?: (params: { text: string }) => void | Promise<void>;
};

const WEB_SEARCH_SYSTEM =
  'When the user asks about current events, recent news, real-time information, or anything that may have changed recently, use the webSearch tool to look up the latest information before answering.';

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

  const hasWebSearch = Boolean(process.env.TAVILY_API_KEY);
  const tools = hasWebSearch ? { webSearch } : undefined;

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
    ...(tools && {
      tools,
      stopWhen: stepCountIs(3),
      system: WEB_SEARCH_SYSTEM,
    }),
    onFinish: onFinish
      ? async (event) => {
          await onFinish({ text: event.text });
        }
      : undefined,
  });

  return result;
}
