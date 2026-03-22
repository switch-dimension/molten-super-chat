import { generateText } from 'ai';
import { registry } from './provider-registry';

export async function generateChatTitle(userMessage: string): Promise<string> {
  const model = registry.languageModel('openai:gpt-4o-mini');

  const { text } = await generateText({
    model,
    system:
      'Generate a short, concise title (max 6 words) for a chat conversation based on the user\'s first message. Return only the title text, no quotes or punctuation at the end.',
    prompt: userMessage,
    maxOutputTokens: 20,
  });

  return text.trim().replace(/[".]+$/, '');
}
