import { tool } from 'ai';
import { z } from 'zod';

export const webSearch = tool({
  description:
    'Search the web for current information, news, or facts. Use this when the user asks about recent events, real-time data, or anything that may have changed since your knowledge cutoff.',
  inputSchema: z.object({
    query: z.string().describe('The search query to execute'),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return { error: 'Tavily API key is not configured', results: [] };
    }
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { error: `Tavily API error: ${res.status} ${err}`, results: [] };
    }
    const data = (await res.json()) as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    return {
      answer: data.answer ?? null,
      results:
        data.results?.map((r) => ({
          title: r.title ?? '',
          url: r.url ?? '',
          content: r.content ?? '',
        })) ?? [],
    };
  },
});
