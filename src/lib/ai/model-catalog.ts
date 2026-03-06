/**
 * UI-facing model catalog. Use registry.languageModel(id) for actual provider resolution.
 * Format: providerId:modelId (e.g. openai:gpt-4o, anthropic:claude-sonnet-4-20250514)
 */
export interface CatalogModel {
  id: string;
  label: string;
  provider: 'openai' | 'anthropic' | 'google';
  description?: string;
}

export const MODEL_CATALOG: CatalogModel[] = [
  // OpenAI
  { id: 'openai:gpt-4o', label: 'GPT-4o', provider: 'openai', description: 'Fast, capable' },
  { id: 'openai:gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai', description: 'Fast, affordable' },
  { id: 'openai:gpt-4.1', label: 'GPT-4.1', provider: 'openai', description: 'Latest GPT-4' },
  { id: 'openai:gpt-4.1-mini', label: 'GPT-4.1 mini', provider: 'openai', description: 'Smaller, fast' },
  { id: 'openai:gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai', description: 'Legacy, cheap' },
  // Anthropic
  { id: 'anthropic:claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic', description: 'Balanced' },
  { id: 'anthropic:claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', description: 'Strong reasoning' },
  { id: 'anthropic:claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', description: 'Fast' },
  { id: 'anthropic:claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic', description: 'Most capable' },
  // Google
  { id: 'google:gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google', description: 'Latest Pro' },
  { id: 'google:gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google', description: 'Fast' },
  { id: 'google:gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google', description: 'Efficient' },
  { id: 'google:gemini-3-pro-preview', label: 'Gemini 3 Pro (preview)', provider: 'google', description: 'Preview' },
];

const catalogById = new Map(MODEL_CATALOG.map((m) => [m.id, m]));

export function getModelById(id: string): CatalogModel | undefined {
  return catalogById.get(id);
}

export function getModelsByProvider(provider: CatalogModel['provider']): CatalogModel[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider);
}

export function getDefaultModelId(): string {
  return MODEL_CATALOG[0]!.id;
}
